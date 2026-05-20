"""
HWP 파일 텍스트 + 이미지 추출기
- 텍스트: 바이너리 레코드 파싱 (본문 + 도형 + 표)
- 이미지: OLE 스트림에서 추출 후 OCR
"""

import os
import struct
import zlib
import olefile
from PIL import Image
import io
import numpy as np

_OCR_READER = None

def get_ocr_reader():
    global _OCR_READER
    if _OCR_READER is None:
        import easyocr
        print("OCR 모델 로딩 중...")
        _OCR_READER = easyocr.Reader(['ko', 'en'], gpu=False)
    return _OCR_READER


def check_hwp_compressed(ole):
    try:
        header = ole.openstream('FileHeader').read()
        flags = struct.unpack_from('<I', header, 36)[0]
        return bool(flags & 0x1)
    except:
        return True


def iter_records(data):
    offset = 0
    while offset + 4 <= len(data):
        hval = struct.unpack_from('<I', data, offset)[0]
        offset += 4
        tag_id = hval & 0x3FF
        level  = (hval >> 10) & 0x3FF
        size   = (hval >> 20) & 0xFFF
        if size == 0xFFF:
            if offset + 4 > len(data): break
            size = struct.unpack_from('<I', data, offset)[0]
            offset += 4
        if offset + size > len(data): break
        record = data[offset:offset + size]
        offset += size
        yield tag_id, level, record


PARA_HEADER_TAG = 66
PARA_TEXT_TAG   = 67
SHAPE_TAG       = 71
TABLE_TAG       = 34
CELL_TAG        = 35

def decode_para_text(record: bytes) -> str:
    try:
        text = record.decode('utf-16-le')
        cleaned = ''
        for c in text:
            code = ord(c)
            if code in (0x0A, 0x0D):
                cleaned += ' '
            elif code < 0x20:
                pass
            else:
                cleaned += c
        return cleaned.strip()
    except:
        return ''


def extract_text(ole, is_compressed):
    body_paragraphs = []
    shape_groups    = []
    table_groups    = []

    section_idx = 0
    while ole.exists(f'BodyText/Section{section_idx}'):
        raw = ole.openstream(f'BodyText/Section{section_idx}').read()

        if is_compressed:
            try:
                data = zlib.decompress(raw, -15)
            except:
                try:
                    data = zlib.decompress(raw)
                except:
                    data = raw
        else:
            data = raw

        current_para  = []
        current_shape = []
        current_row   = []
        current_table = []
        mode = 'body'

        for tag_id, level, record in iter_records(data):
            if tag_id == TABLE_TAG and level == 1:
                if current_para:
                    body_paragraphs.append(''.join(current_para))
                    current_para = []
                mode = 'table'
                current_table = []
                current_row   = []
                continue

            if tag_id == SHAPE_TAG and level == 1:
                if current_para:
                    body_paragraphs.append(''.join(current_para))
                    current_para = []
                mode = 'shape'
                current_shape = []
                continue

            if tag_id == PARA_HEADER_TAG and level == 0:
                if mode == 'shape' and current_shape:
                    shape_groups.append('\n'.join(current_shape))
                    current_shape = []
                elif mode == 'table':
                    if current_row:
                        current_table.append(' | '.join(current_row))
                        current_row = []
                    if current_table:
                        table_groups.append('\n'.join(current_table))
                        current_table = []
                mode = 'body'
                if current_para:
                    body_paragraphs.append(''.join(current_para))
                    current_para = []
                continue

            if tag_id == CELL_TAG and mode == 'table':
                if current_row:
                    current_table.append(' | '.join(current_row))
                    current_row = []
                continue

            if tag_id == PARA_TEXT_TAG:
                text = decode_para_text(record)
                if not text:
                    continue
                if mode == 'body':
                    current_para.append(text)
                elif mode == 'shape':
                    current_shape.append(text)
                elif mode == 'table':
                    current_row.append(text)

        if current_para:
            body_paragraphs.append(''.join(current_para))
        if current_shape:
            shape_groups.append('\n'.join(current_shape))
        if current_row:
            current_table.append(' | '.join(current_row))
        if current_table:
            table_groups.append('\n'.join(current_table))

        section_idx += 1

    body   = '\n'.join(p for p in body_paragraphs if p.strip())
    shapes = '\n\n'.join(f'[도형 {i+1}]\n{t}' for i, t in enumerate(shape_groups) if t.strip())
    tables = '\n\n'.join(f'[표 {i+1}]\n{t}'  for i, t in enumerate(table_groups)  if t.strip())
    return body, shapes, tables


def clean_hwp_text(text):
    cleaned_lines = []
    for line in text.split('\n'):
        if not line.strip():
            continue
        has_korean = any('\uAC00' <= c <= '\uD7A3' or '\u3131' <= c <= '\u318E' for c in line)
        cjk_garbage = sum(1 for c in line if '\u2E80' <= c <= '\u2EFF' or '\u31C0' <= c <= '\u31EF')
        if cjk_garbage > 2 and not has_korean:
            continue
        cleaned = ''
        for c in line:
            if ('\uAC00' <= c <= '\uD7A3'
                or '\u3131' <= c <= '\u318E'
                or 'A' <= c <= 'Z' or 'a' <= c <= 'z'
                or '0' <= c <= '9'
                or c in ' \t.,;:!?()[]{}「」『』【】《》·×÷±≤≥-_/\\@#%&*+=<>\'"~`^|'
                or c in '。、·…—–\'\'""※△▲▽▼○●□■◇◆☆★'
                or '\u0020' <= c <= '\u007E'
                or c in '①②③④⑤⑥⑦⑧⑨⑩'
                or '\uFF01' <= c <= '\uFF60'):
                cleaned += c
        cleaned = cleaned.strip()
        if cleaned:
            cleaned_lines.append(cleaned)
    return '\n'.join(cleaned_lines)


IMAGE_SIGNATURES = {
    b'\xff\xd8\xff': 'jpg',
    b'\x89PNG':      'png',
    b'GIF8':         'gif',
    b'BM':           'bmp',
}

def detect_image_format(data):
    for sig, fmt in IMAGE_SIGNATURES.items():
        if data[:len(sig)] == sig:
            return fmt
    return None


def extract_images_from_ole(ole):
    images = []
    for stream_path in ole.listdir():
        if stream_path[0] == 'PrvImage':
            continue
        if stream_path[0] == 'BinData':
            try:
                data = ole.openstream(stream_path).read()
                filename = stream_path[-1]
                ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
                try:
                    data = zlib.decompress(data, -15)
                except:
                    try:
                        data = zlib.decompress(data)
                    except:
                        pass
                fmt_map = {'jpg': b'\xff\xd8\xff', 'jpeg': b'\xff\xd8\xff',
                           'png': b'\x89PNG', 'gif': b'GIF8', 'bmp': b'BM'}
                if ext in fmt_map:
                    idx = data.find(fmt_map[ext])
                    if idx != -1:
                        data = data[idx:]
                    fmt = 'jpg' if ext == 'jpeg' else ext
                else:
                    fmt = detect_image_format(data)
                if fmt:
                    images.append({'data': data, 'format': fmt, 'filename': filename})
            except:
                pass
    return images


def preprocess_image(img):
    from PIL import ImageEnhance
    if img.mode not in ('RGB', 'L'):
        img = img.convert('RGB')
    w, h = img.size
    scale = max(2.0, 1600 / w)
    img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    img = ImageEnhance.Contrast(img).enhance(1.8)
    img = ImageEnhance.Sharpness(img).enhance(2.0)
    return img


def ocr_image(img_data):
    try:
        buf = io.BytesIO(bytes(img_data))
        img = Image.open(buf)
        img.load()
        img = preprocess_image(img)
        img_np = np.array(img)
        results = get_ocr_reader().readtext(img_np, detail=1, paragraph=False)
        lines = [text for (_, text, conf) in results if conf >= 0.2]
        return '\n'.join(lines).strip()
    except Exception as e:
        return f"[OCR 실패: {e}]"


def extract_text_from_hwp(file_path: str) -> str:
    ole = olefile.OleFileIO(file_path)
    is_compressed = check_hwp_compressed(ole)
    body_text, shape_text, table_text = extract_text(ole, is_compressed)
    images = extract_images_from_ole(ole)
    ole.close()

    body_text  = clean_hwp_text(body_text)
    shape_text = clean_hwp_text(shape_text)
    table_text = clean_hwp_text(table_text)

    ocr_texts = []
    for img in images:
        ocr = ocr_image(img['data'])
        if ocr and len(ocr) > 3:
            ocr_texts.append(ocr)

    parts = [body_text]
    if shape_text.strip():
        parts.append(shape_text)
    if table_text.strip():
        parts.append(table_text)
    if ocr_texts:
        parts.append('\n'.join(ocr_texts))

    return '\n\n'.join(parts)