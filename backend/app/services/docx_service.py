"""
docx_service.py
.doc / .docx 파일에서 텍스트 추출 서비스

개선 사항:
  - 이미지 내 표 감지: OpenCV 형태학적 선 감지 → 셀 단위 OCR → 행/열 구조 보존
  - 단어 누락 감소: OCR 신뢰도 임계값 하향, NMS IoU 임계값 상향
"""

from __future__ import annotations

import hashlib
import io
import logging
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path

import cv2
import numpy as np
from docx import Document
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph
from lxml import etree
from PIL import Image

logger = logging.getLogger(__name__)

# ── 상수 ────────────────────────────────────────────────────────────────────
MIN_OCR_SIDE        = 1200
OCR_CONF_THRESHOLD  = 0.10   # 0.15 → 0.10: 낮은 신뢰도 결과도 포함해 누락 방지
NMS_IOU_THRESHOLD   = 0.50   # 0.35 → 0.50: 과도한 억제 방지
TABLE_LINE_RATIO    = 0.015  # 이미지 내 표 판정 최소 선 픽셀 비율
MAX_BLANK_LINES     = 2
INDENT_UNIT         = 2
CELL_PAD            = 1
SUPPORTED_IMG_EXT   = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif", ".gif", ".webp"}
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

# ── EasyOCR 싱글턴 ───────────────────────────────────────────────────────────
_ocr_reader = None

def _get_reader():
    global _ocr_reader
    if _ocr_reader is None:
        import easyocr
        logger.info("EasyOCR 초기화 중…")
        _ocr_reader = easyocr.Reader(["ko", "en"], gpu=False)
    return _ocr_reader


# ── 이미지 전처리 ────────────────────────────────────────────────────────────
def _to_bgr(image_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
    return img

def _upscale_if_small(img: np.ndarray) -> np.ndarray:
    h, w = img.shape[:2]
    if max(h, w) >= MIN_OCR_SIDE:
        return img
    scale = MIN_OCR_SIDE / max(h, w)
    return cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)

def _to_gray(img: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if img.ndim == 3 else img

def _pp_original(g: np.ndarray) -> np.ndarray:
    return cv2.createCLAHE(clipLimit=3.0, tileGridSize=(4, 4)).apply(g)

def _pp_clahe(g: np.ndarray) -> np.ndarray:
    enhanced = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(g)
    thresh = cv2.adaptiveThreshold(enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY, 31, 10)
    return cv2.fastNlMeansDenoising(thresh, h=10)

def _pp_otsu(g: np.ndarray) -> np.ndarray:
    _, t = cv2.threshold(g, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    k = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    return cv2.morphologyEx(t, cv2.MORPH_OPEN, k)

def _pp_bilateral(g: np.ndarray) -> np.ndarray:
    blurred = cv2.bilateralFilter(g, 9, 75, 75)
    _, t = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    return t


# ── OCR 결과 정렬·병합 ───────────────────────────────────────────────────────
def _bbox_center_y(r: tuple) -> float:
    return sum(p[1] for p in r[0]) / len(r[0])

def _bbox_left_x(r: tuple) -> float:
    return min(p[0] for p in r[0])

def _bbox_height(r: tuple) -> float:
    ys = [p[1] for p in r[0]]
    return max(ys) - min(ys)

def _bbox_to_rect(bbox: list) -> tuple[float, float, float, float]:
    xs = [p[0] for p in bbox]
    ys = [p[1] for p in bbox]
    return min(xs), min(ys), max(xs), max(ys)

def _iou(b1: list, b2: list) -> float:
    ax1, ay1, ax2, ay2 = _bbox_to_rect(b1)
    bx1, by1, bx2, by2 = _bbox_to_rect(b2)
    ix = max(0.0, min(ax2, bx2) - max(ax1, bx1))
    iy = max(0.0, min(ay2, by2) - max(ay1, by1))
    inter = ix * iy
    union = (ax2 - ax1) * (ay2 - ay1) + (bx2 - bx1) * (by2 - by1) - inter
    return inter / union if union > 0 else 0.0

def _nms_merge(all_results: list[list[tuple]]) -> list[tuple]:
    """
    여러 전처리 결과를 NMS로 병합.
    IoU 임계값을 0.50으로 높여 서로 다른 단어가 억제되지 않도록 함.
    """
    flat = [item for results in all_results for item in results]
    if not flat:
        return []
    flat.sort(key=lambda r: r[2], reverse=True)
    kept: list[tuple] = []
    for candidate in flat:
        if any(_iou(candidate[0], k[0]) > NMS_IOU_THRESHOLD for k in kept):
            continue
        kept.append(candidate)
    return kept

def _group_into_lines(results: list[tuple]) -> list[list[tuple]]:
    if not results:
        return []
    avg_h     = sum(_bbox_height(r) for r in results) / len(results)
    threshold = max(avg_h * 0.6, 8)
    by_y      = sorted(results, key=_bbox_center_y)
    lines, cur, ref_y = [], [by_y[0]], _bbox_center_y(by_y[0])
    for item in by_y[1:]:
        if _bbox_center_y(item) - ref_y <= threshold:
            cur.append(item)
        else:
            lines.append(cur)
            cur, ref_y = [item], _bbox_center_y(item)
    lines.append(cur)
    return [sorted(line, key=_bbox_left_x) for line in lines]

def _lines_to_text(lines: list[list[tuple]]) -> str:
    return "\n".join(
        " ".join(r[1].strip() for r in line if r[1].strip())
        for line in lines
    )


# ── [개선] 이미지 내 표 감지 및 셀 단위 OCR ─────────────────────────────────
def _find_line_positions(proj: np.ndarray, threshold: float, min_gap: int = 8) -> list[int]:
    """투영 배열에서 선의 중심 위치 목록을 반환."""
    positions: list[int] = []
    in_line, start = False, 0
    for i, val in enumerate(proj):
        if val > threshold and not in_line:
            in_line, start = True, i
        elif val <= threshold and in_line:
            in_line = False
            mid = (start + i) // 2
            if not positions or mid - positions[-1] >= min_gap:
                positions.append(mid)
    if in_line:
        positions.append((start + len(proj) - 1) // 2)
    return positions


def _detect_table_cells(gray: np.ndarray) -> tuple[list, int, int] | None:
    """
    수평·수직 선을 형태학적으로 감지해 표 셀 경계를 추출한다.

    반환:
        (cells, num_rows, num_cols) — cells = [(row, col, y1, x1, y2, x2), ...]
        표가 없으면 None
    """
    h, w = gray.shape
    if h < 60 or w < 60:
        return None

    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)

    # 수평선: 너비의 1/6 이상 길이
    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (max(20, w // 6), 1))
    h_lines  = cv2.morphologyEx(binary, cv2.MORPH_OPEN, h_kernel, iterations=2)

    # 수직선: 높이의 1/6 이상 길이
    v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(20, h // 6)))
    v_lines  = cv2.morphologyEx(binary, cv2.MORPH_OPEN, v_kernel, iterations=2)

    total = h * w
    if (np.count_nonzero(h_lines) / total < TABLE_LINE_RATIO or
            np.count_nonzero(v_lines) / total < TABLE_LINE_RATIO):
        return None  # 표 없음

    h_proj = np.sum(h_lines > 0, axis=1).astype(float)
    v_proj = np.sum(v_lines > 0, axis=0).astype(float)

    h_ys = _find_line_positions(h_proj, max(h_proj) * 0.20, min_gap=8)
    v_xs = _find_line_positions(v_proj, max(v_proj) * 0.20, min_gap=8)

    if len(h_ys) < 2 or len(v_xs) < 2:
        return None

    pad   = 3
    cells = [
        (r, c,
         max(0, h_ys[r] + pad), max(0, v_xs[c] + pad),
         min(h, h_ys[r + 1] - pad), min(w, v_xs[c + 1] - pad))
        for r in range(len(h_ys) - 1)
        for c in range(len(v_xs) - 1)
        if h_ys[r + 1] - h_ys[r] > pad * 2 and v_xs[c + 1] - v_xs[c] > pad * 2
    ]

    return cells, len(h_ys) - 1, len(v_xs) - 1


def _ocr_cell(cell_gray: np.ndarray) -> str:
    """단일 셀 이미지에서 텍스트 추출."""
    h, w = cell_gray.shape
    if h < 10 or w < 10:
        return ""

    # 너무 작은 셀은 업스케일
    scale = max(1.0, 60 / min(h, w))
    if scale > 1.0:
        cell_gray = cv2.resize(cell_gray, (int(w * scale), int(h * scale)),
                               interpolation=cv2.INTER_CUBIC)

    _, thresh = cv2.threshold(cell_gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    raw = _get_reader().readtext(
        thresh,
        detail=1,
        paragraph=False,
        min_size=5,
        text_threshold=0.5,
        low_text=0.3,
        width_ths=0.9,
        add_margin=0.1,
    )
    return " ".join(r[1].strip() for r in raw if r[2] >= OCR_CONF_THRESHOLD and r[1].strip())


def _ocr_table_image(gray: np.ndarray, cells_info: tuple) -> str:
    """
    셀 단위로 OCR 후 ASCII 표로 재구성한다.
    행/열 구조를 완전히 보존한다.
    """
    cells, num_rows, num_cols = cells_info

    grid: dict[tuple[int, int], str] = {}
    for r, c, y1, x1, y2, x2 in cells:
        grid[(r, c)] = _ocr_cell(gray[y1:y2, x1:x2])

    # 열 너비 계산 (최소 3)
    col_widths = [
        max(3, max((len(grid.get((r, c), "")) for r in range(num_rows)), default=0) + CELL_PAD * 2)
        for c in range(num_cols)
    ]

    def border(l: str, m: str, r_: str, f: str) -> str:
        return l + m.join(f * w for w in col_widths) + r_

    def data_row(row: int) -> str:
        parts = [
            " " * CELL_PAD + grid.get((row, c), "").ljust(col_widths[c] - CELL_PAD * 2) + " " * CELL_PAD
            for c in range(num_cols)
        ]
        return "│" + "│".join(parts) + "│"

    lines = [border("┌", "┬", "┐", "─")]
    for r in range(num_rows):
        lines.append(data_row(r))
        if r < num_rows - 1:
            lines.append(border("├", "┼", "┤", "─"))
    lines.append(border("└", "┴", "┘", "─"))
    return "\n".join(lines)


# ── OCR 메인 (캐시 내장) ─────────────────────────────────────────────────────
_ocr_cache: dict[str, str] = {}

def ocr_image(image_bytes: bytes, label: str = "") -> str:
    """
    이미지에서 텍스트 추출.
    표 이미지 → 셀별 OCR (행/열 구조 보존)
    일반 이미지 → 4가지 전처리 + NMS 병합
    """
    key = hashlib.md5(image_bytes).hexdigest()
    if key in _ocr_cache:
        return _ocr_cache[key]

    try:
        img  = _upscale_if_small(_to_bgr(image_bytes))
        gray = _to_gray(img)

        # 1) 표 감지 → 셀별 OCR
        table_info = _detect_table_cells(gray)
        if table_info is not None:
            logger.info("  표 이미지 감지 → 셀별 OCR: %s", label)
            text = _ocr_table_image(gray, table_info)
            _ocr_cache[key] = text
            return text

        # 2) 일반 이미지 → 다중 전처리 + NMS
        reader = _get_reader()
        all_results: list[list[tuple]] = []
        for pp in (_pp_original, _pp_clahe, _pp_otsu, _pp_bilateral):
            raw = reader.readtext(
                pp(gray),
                detail=1,
                paragraph=False,
                min_size=10,
                text_threshold=0.6,
                low_text=0.3,
                width_ths=0.7,
                add_margin=0.05,
            )
            all_results.append([r for r in raw if r[2] >= OCR_CONF_THRESHOLD and r[1].strip()])

        merged = _nms_merge(all_results)
        text   = _lines_to_text(_group_into_lines(merged))

        if not text:
            logger.warning("  OCR 결과 없음: %s", label)
        _ocr_cache[key] = text

    except Exception as exc:
        logger.error("OCR 실패 (%s): %s", label, exc)
        _ocr_cache[key] = f"[OCR 오류: {exc}]"

    return _ocr_cache[key]


# ── .docx 이미지 맵 ──────────────────────────────────────────────────────────
def _build_image_map(docx_path: Path) -> dict[str, tuple[str, bytes]]:
    image_map: dict[str, tuple[str, bytes]] = {}
    with zipfile.ZipFile(docx_path) as zf:
        try:
            rels_xml = zf.read("word/_rels/document.xml.rels")
        except KeyError:
            return image_map
        for rel in etree.fromstring(rels_xml):
            if "/image" not in rel.get("Type", ""):
                continue
            rid    = rel.get("Id", "")
            target = rel.get("Target", "")
            path   = f"word/{target}" if not target.startswith("/") else target[1:]
            try:
                image_map[rid] = (Path(target).name, zf.read(path))
            except KeyError:
                logger.warning("이미지 파일 없음: %s", path)
    return image_map

def _para_image_rids(para_element) -> list[str]:
    embed_attr = f"{{{R_NS}}}embed"
    return [e.get(embed_attr) for e in para_element.iter() if e.get(embed_attr)]


# ── 단락·표 포맷터 ───────────────────────────────────────────────────────────
def _indent_level(para: Paragraph) -> int:
    pPr = para._p.pPr
    if pPr is None:
        return 0
    num = pPr.find(qn("w:numPr"))
    if num is not None:
        ilvl = num.find(qn("w:ilvl"))
        if ilvl is not None:
            return int(ilvl.get(qn("w:val"), "0"))
    ind = pPr.find(qn("w:ind"))
    if ind is not None:
        try:
            return max(0, int(ind.get(qn("w:left"), "0")) // 720)
        except ValueError:
            pass
    return 0

def _list_prefix(para: Paragraph) -> str:
    pPr = para._p.pPr
    if pPr is None or pPr.find(qn("w:numPr")) is None:
        return ""
    style = (para.style.name or "").lower() if para.style else ""
    return "1. " if ("number" in style or "번호" in style) else "• "

def _format_paragraph(para: Paragraph, img_map: dict[str, tuple[str, bytes]]) -> list[str]:
    text   = para.text
    indent = " " * (_indent_level(para) * INDENT_UNIT)
    prefix = _list_prefix(para)
    lines: list[str] = [f"{indent}{prefix}{text}" if text.strip() else ""]
    for rid in _para_image_rids(para._p):
        if rid not in img_map:
            continue
        fname, img_bytes = img_map[rid]
        if Path(fname).suffix.lower() not in SUPPORTED_IMG_EXT:
            continue
        logger.info("  이미지 OCR: %s", fname)
        ocr = ocr_image(img_bytes, fname)
        if ocr:
            lines += ["", "[IMAGE OCR]"] + ocr.splitlines() + ["[/IMAGE OCR]", ""]
    return lines

def _format_table(table: Table) -> list[str]:
    rows_data: list[list[str]] = []
    for row in table.rows:
        seen: set[int] = set()
        cells: list[str] = []
        for cell in row.cells:
            cid = id(cell._tc)
            cells.append(cell.text.strip().replace("\n", " ") if cid not in seen else "")
            seen.add(cid)
        rows_data.append(cells)
    if not rows_data:
        return []
    col_n     = max(len(r) for r in rows_data)
    rows_data = [r + [""] * (col_n - len(r)) for r in rows_data]
    widths    = [max(len(rows_data[ri][ci]) for ri in range(len(rows_data))) + CELL_PAD * 2
                 for ci in range(col_n)]
    widths    = [max(w, 3) for w in widths]

    def border(l: str, m: str, r_: str, f: str) -> str:
        return l + m.join(f * w for w in widths) + r_

    def data_row(cells: list[str]) -> str:
        parts = [" " * CELL_PAD + c.ljust(widths[i] - CELL_PAD * 2) + " " * CELL_PAD
                 for i, c in enumerate(cells)]
        return "│" + "│".join(parts) + "│"

    lines = [border("┌", "┬", "┐", "─")]
    for i, row in enumerate(rows_data):
        lines.append(data_row(row))
        if i < len(rows_data) - 1:
            lines.append(border("├", "┼", "┤", "─"))
    return lines + [border("└", "┴", "┘", "─"), ""]


# ── .docx 전체 추출 ──────────────────────────────────────────────────────────
def _extract_docx(file_path: Path) -> str:
    doc     = Document(str(file_path))
    img_map = _build_image_map(file_path)
    raw: list[str] = []
    for child in doc.element.body:
        tag = child.tag.split("}")[-1]
        if tag == "p":
            raw.extend(_format_paragraph(Paragraph(child, doc), img_map))
        elif tag == "tbl":
            raw.extend(_format_table(Table(child, doc)))

    lines: list[str] = []
    blanks = 0
    for line in raw:
        if line == "":
            blanks += 1
            if blanks <= MAX_BLANK_LINES:
                lines.append("")
        else:
            blanks = 0
            lines.append(line)
    return "\n".join(lines).strip()


# ── .doc 처리 (변환 도구 순차 시도) ─────────────────────────────────────────
def _mammoth(doc_path: Path) -> str | None:
    try:
        import mammoth
        with open(doc_path, "rb") as f:
            result = mammoth.convert_to_markdown(f)
        return result.value.strip() or None
    except Exception:
        return None

def _libreoffice(doc_path: Path) -> str | None:
    lo = next((c for c in ("libreoffice", "soffice") if shutil.which(c)), None)
    if not lo:
        return None
    with tempfile.TemporaryDirectory() as tmp:
        try:
            subprocess.run(
                [lo, "--headless", "--convert-to", "docx", "--outdir", tmp, str(doc_path)],
                check=True, capture_output=True, timeout=60,
            )
            converted = next(Path(tmp).glob("*.docx"), None)
            return _extract_docx(converted) if converted else None
        except Exception:
            return None

def _cli_tool(cmd: str, doc_path: Path) -> str | None:
    if not shutil.which(cmd):
        return None
    try:
        r = subprocess.run([cmd, str(doc_path)], capture_output=True,
                           text=True, encoding="utf-8", errors="replace", timeout=30)
        return r.stdout.strip() or None
    except Exception:
        return None

def _extract_doc(file_path: Path) -> str:
    text = (_mammoth(file_path) or _libreoffice(file_path)
            or _cli_tool("antiword", file_path) or _cli_tool("catdoc", file_path))
    if not text:
        return "[.doc 추출 실패]\n해결: pip install mammoth 또는 LibreOffice 설치"
    return text


# ── 서비스 클래스 ────────────────────────────────────────────────────────────
class DocxService:
    """
    .docx / .doc 텍스트 추출 서비스.
    document_service.py 에서 아래와 같이 사용:
        from app.services.docx_service import docx_service
        content = docx_service.extract_text(file_path)
    """

    def extract_text(self, file_path: str) -> str:
        path = Path(file_path)
        ext  = path.suffix.lower()
        if ext == ".docx":
            return _extract_docx(path)
        elif ext == ".doc":
            return _extract_doc(path)
        else:
            raise ValueError(f"지원하지 않는 파일 형식: {ext}")


docx_service = DocxService()
