"""
pdf_service.py
PDF 파일에서 텍스트 추출 서비스

추출 전략:
  1) pdfplumber로 일반 텍스트 + 표 항상 추출
  2) 페이지에 이미지가 있으면 해당 페이지만 렌더링 후 EasyOCR 추가 실행
     → 이미지 안의 표, 스캔 내용까지 모두 추출
  3) 텍스트 추출 결과 + OCR 결과를 합쳐서 반환
"""

from __future__ import annotations

import logging
import re

import cv2
import numpy as np
import pdfplumber
from pdf2image import convert_from_path
from PIL import Image

from app.core.config import settings

logger = logging.getLogger(__name__)

POPPLER_PATH = settings.POPPLER_PATH

# OCR 신뢰도 최소값
OCR_CONFIDENCE_THRESHOLD = 0.4

# ── EasyOCR 싱글턴 ───────────────────────────────────────────────────────────
_ocr_reader = None

def _get_reader():
    global _ocr_reader
    if _ocr_reader is None:
        import easyocr
        logger.info("EasyOCR 초기화 중...")
        _ocr_reader = easyocr.Reader(["ko", "en"], gpu=False)
    return _ocr_reader


# ── 이미지 전처리 ────────────────────────────────────────────────────────────
def _preprocess_for_ocr(pil_image: Image.Image) -> np.ndarray:
    img = np.array(pil_image.convert("RGB"))
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)

    # 저해상도면 2배 업스케일
    h, w = gray.shape
    if w < 1200:
        gray = cv2.resize(gray, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC)

    # 가우시안 블러로 노이즈 제거
    gray = cv2.GaussianBlur(gray, (3, 3), 0)

    # CLAHE 대비 향상
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    # 적응형 이진화
    binary = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        11, 2
    )
    return binary


# ── OCR 수행 ─────────────────────────────────────────────────────────────────
def _run_ocr(pil_image: Image.Image) -> str:
    """
    PIL Image를 받아 EasyOCR로 텍스트 추출.
    paragraph=False로 셀 단위 개별 인식 (표 내부 텍스트 누락 방지).
    위→아래 순으로 정렬 후 반환.
    """
    reader = _get_reader()
    img_array = _preprocess_for_ocr(pil_image)
    results = reader.readtext(img_array, detail=1, paragraph=False)

    lines: list[tuple[float, str]] = []
    for bbox, text, conf in results:
        if conf < OCR_CONFIDENCE_THRESHOLD:
            continue
        y_center = (bbox[0][1] + bbox[2][1]) / 2
        lines.append((y_center, text.strip()))

    lines.sort(key=lambda t: t[0])
    return "\n".join(t for _, t in lines if t)


# ── 텍스트 후처리 ────────────────────────────────────────────────────────────
def _postprocess(text: str) -> str:
    """연속 공백·줄바꿈 정규화."""
    text = text.replace("_", " ")
    text = re.sub(r" +", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"\f", "\n", text)
    return text.strip()


# ── 서비스 클래스 ─────────────────────────────────────────────────────────────
class PDFService:

    def extract_text_ocr(self, pdf_path: str) -> str:

        full_text_parts: list[str] = []
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for i, page in enumerate(pdf.pages):
                    page_num = i + 1
                    page_parts: list[str] = []

                    # 1) pdfplumber 텍스트 + 표 추출 (항상 실행)
                    extracted = self._extract_page_text(page)
                    if extracted.strip():
                        logger.info(f"페이지 {page_num}: 텍스트 추출 ({len(extracted)}자)")
                        page_parts.append(extracted)

                    # 2) 이미지가 있으면 OCR 추가 실행 (항상)
                    if page.images:
                        logger.info(f"페이지 {page_num}: 이미지 감지 → OCR 실행")
                        ocr_text = self._ocr_single_page(pdf_path, page_num)
                        if ocr_text.strip():
                            page_parts.append(ocr_text)

                    if page_parts:
                        full_text_parts.append("\n\n".join(page_parts))
                    else:
                        logger.warning(f"페이지 {page_num}: 추출된 텍스트 없음")

        except Exception as e:
            logger.error(f"PDF 처리 중 오류 발생: {e}")
            raise

        result = "\n\n".join(full_text_parts)
        return _postprocess(result)

    def _extract_page_text(self, page) -> str:
        """
        pdfplumber 페이지에서 일반 텍스트와 표를 모두 추출.
        표는 행/열 구조를 유지하며 텍스트로 변환.
        """
        parts: list[str] = []

        # 일반 텍스트
        text = page.extract_text(x_tolerance=2, y_tolerance=2) or ""
        if text.strip():
            parts.append(text.strip())

        # 표 추출 (항상 시도)
        tables = page.extract_tables()
        for table in tables:
            table_text = self._format_table(table)
            if table_text:
                parts.append(table_text)

        return "\n\n".join(parts)

    def _format_table(self, table: list[list]) -> str:
        """2D 리스트로 된 표를 텍스트로 변환."""
        if not table:
            return ""
        rows = []
        for row in table:
            cells = [str(cell).strip() if cell else "" for cell in row]
            rows.append(" | ".join(cells))
        return "\n".join(rows)

    def _ocr_single_page(self, pdf_path: str, page_num: int) -> str:
        """
        특정 페이지만 이미지로 렌더링해서 OCR 수행.
        first_page, last_page로 해당 페이지만 처리하여 메모리 절감.
        """
        try:
            images = convert_from_path(
                pdf_path,
                poppler_path=POPPLER_PATH,
                first_page=page_num,
                last_page=page_num,
                dpi=150,
            )
            if not images:
                return ""
            return _run_ocr(images[0])
        except Exception as e:
            logger.error(f"페이지 {page_num} OCR 실패: {e}")
            return ""


pdf_service = PDFService()