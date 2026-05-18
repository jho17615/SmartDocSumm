"""
HWP 파일 텍스트 + 이미지 추출기
- 텍스트: 바이너리 레코드 파싱
- 이미지: OLE 스트림에서 추출 후 저장
- OCR: easyocr로 이미지 내 텍스트 인식 (한국어+영어)
  → Tesseract 설치 불필요, pip install easyocr 만으로 동작
"""

import os
import struct
import zlib
import olefile
from PIL import Image
import io
import numpy as np
import easyocr

# EasyOCR 리더 초기화 (한국어 + 영어, 최초 1회 모델 다운로드)
print("OCR 모델 로딩 중... (최초 실행 시 다운로드 발생)")
OCR_READER = easyocr.Reader(['ko', 'en'], gpu=False)


# ──────────────────────────────────────────
# 1. 텍스트 추출
# ──────────────────────────────────────────

def check_hwp_compressed(ole):
    try:
        header = ole.openstream('FileHeader').read()
        flags = struct.unpack_from('<I', header, 36)[0]
        return bool(flags & 0x1)
    except:
        return True


def extract_text(ole, is_compressed):
    """BodyText/Section* 스트림에서 본문 텍스트와 도형 텍스트 분리 추출"""
    
    paragraphs = []
    shape_groups = []
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
        
        PARA_HEADER_TAG = 66
        PARA_TEXT_TAG   = 67
        SHAPE_TAG       = 71  # 도형 컨테이너
        
        current_para = []
        offset = 0
        in_shape = False
        shape_level = 0
        current_shape = []
        
        while offset + 4 <= len(data):
            hval   = struct.unpack_from('<I', data, offset)[0]
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
            
            # 도형 시작: 태그71 레벨1
            if tag_id == SHAPE_TAG and level == 1:
                in_shape = True
                shape_level = level
                current_shape = []
                continue
            
            # 도형 종료: 레벨0 태그66 = 새 본문 문단 시작
            if in_shape and tag_id == PARA_HEADER_TAG and level == 0:
                if current_shape:
                    shape_groups.append('\n'.join(current_shape))
                in_shape = False
                current_shape = []
            
            if in_shape:
                # 도형 안 텍스트
                if tag_id == PARA_TEXT_TAG:
                    try:
                        text = record.decode('utf-16-le', errors='ignore')
                        cleaned = ''.join(
                            ' ' if ord(c) in (0x0A, 0x0D) else
                            '' if ord(c) < 0x20 else c
                            for c in text
                        ).strip()
                        if cleaned:
                            current_shape.append(cleaned)
                    except:
                        pass
            else:
                # 본문 텍스트
                if tag_id == PARA_HEADER_TAG:
                    if current_para:
                        paragraphs.append(''.join(current_para))
                    current_para = []
                
                elif tag_id == PARA_TEXT_TAG:
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
                        if cleaned.strip():
                            current_para.append(cleaned)
                    except:
                        pass
        
        if current_para:
            paragraphs.append(''.join(current_para))
        if current_shape:
            shape_groups.append('\n'.join(current_shape))
        
        section_idx += 1
    
    body = '\n'.join(
        p for p in paragraphs
        if p.strip() and not all(ord(c) > 0x2E7F and ord(c) < 0xAC00 for c in p.strip())
    )
    shapes = '\n\n'.join(
        f'[도형 {i+1}]\n{t}' for i, t in enumerate(shape_groups) if t.strip()
    )
    return body, shapes


def clean_hwp_text(text):
    """HWP 제어문자 및 깨진 문자 제거"""
    import unicodedata
    
    cleaned_lines = []
    for line in text.split('\n'):
        if not line.strip():
            continue
        
        # 한중일 통합한자 영역 문자만 있는 줄 제거 (U+4E00~U+9FFF)
        # 단, 한국어(한글)가 포함된 줄은 유지
        has_korean = any('\uAC00' <= c <= '\uD7A3' or '\u3131' <= c <= '\u318E' for c in line)
        has_latin = any('A' <= c <= 'Z' or 'a' <= c <= 'z' or '0' <= c <= '9' for c in line)
        has_punctuation = any(c in '.,;:!?()[]{}「」『』【】《》〈〉·×÷±≤≥' for c in line)
        
        # 깨진 CJK 문자 비율 계산
        cjk_garbage = sum(1 for c in line if '\u2E80' <= c <= '\u2EFF'  # CJK 부수
                          or '\u31C0' <= c <= '\u31EF'  # CJK 획
                          or c in '㊙Ā†普汫╣ॣ桤灧漠杳湯湷慴')
        
        # 깨진 문자가 많으면 제거, 한국어/영어가 있으면 유지
        if cjk_garbage > 2 and not has_korean:
            continue
        
        # 줄 내에서 깨진 문자 패턴 제거
        cleaned = ''
        for c in line:
            code = ord(c)
            if ('\uAC00' <= c <= '\uD7A3'
                or '\u3131' <= c <= '\u318E'
                or 'A' <= c <= 'Z' or 'a' <= c <= 'z'
                or '0' <= c <= '9'
                or c in ' \t.,;:!?()[]{}「」『』【】《》·×÷±≤≥-_/\\@#%&*+=<>\'\"~`^|'
                or c in '。、·…—–''""※△▲▽▼○●□■◇◆☆★'
                or '\u0020' <= c <= '\u007E'
                or c in '①②③④⑤⑥⑦⑧⑨⑩'
                or '\uFF01' <= c <= '\uFF60'
               ):
                cleaned += c
        
        cleaned = cleaned.strip()
        if cleaned:
            cleaned_lines.append(cleaned)
    
    return '\n'.join(cleaned_lines)




# 이미지 매직 바이트
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
    """BinData 스트림에서 실제 삽입 이미지만 추출 (PrvImage 제외)"""
    
    images = []
    all_streams = ole.listdir()
    
    for stream_path in all_streams:
        stream_name = '/'.join(stream_path)
        
        # PrvImage는 문서 전체 미리보기라서 제외
        if stream_path[0] == 'PrvImage':
            continue
        
        # BinData 폴더 하위 스트림만 처리 (BIN0001.jpg 등)
        if stream_path[0] == 'BinData':
            try:
                data = ole.openstream(stream_path).read()
                filename = stream_path[-1]
                ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
                
                # BinData도 zlib 압축되어 있을 수 있음 → 압축 해제 시도
                try:
                    data = zlib.decompress(data, -15)
                except:
                    try:
                        data = zlib.decompress(data)
                    except:
                        pass  # 압축 안 된 경우 그대로 사용
                
                # 확장자 기반으로 이미지 시작점 찾기
                if ext in ('jpg', 'jpeg'):
                    idx = data.find(b'\xff\xd8\xff')
                    if idx != -1:
                        data = data[idx:]
                    fmt = 'jpg'
                elif ext == 'png':
                    idx = data.find(b'\x89PNG')
                    if idx != -1:
                        data = data[idx:]
                    fmt = 'png'
                elif ext == 'gif':
                    idx = data.find(b'GIF8')
                    if idx != -1:
                        data = data[idx:]
                    fmt = 'gif'
                elif ext == 'bmp':
                    idx = data.find(b'BM')
                    if idx != -1:
                        data = data[idx:]
                    fmt = 'bmp'
                else:
                    fmt = detect_image_format(data)
                
                if fmt:
                    images.append({
                        'data': data,
                        'format': fmt,
                        'stream': stream_name,
                        'filename': filename
                    })
            except:
                pass
    
    return images


def search_images_in_bytes(data):
    """바이너리 데이터 안에서 이미지 시그니처 탐색"""
    
    found = []
    
    search_sigs = {
        b'\xff\xd8\xff': ('jpg', b'\xff\xd9'),       # JPEG
        b'\x89PNG\r\n\x1a\n': ('png', b'IEND\xaeB`\x82'),  # PNG
    }
    
    for sig, (fmt, end_sig) in search_sigs.items():
        start = 0
        while True:
            idx = data.find(sig, start)
            if idx == -1:
                break
            
            if end_sig:
                end_idx = data.find(end_sig, idx)
                if end_idx != -1:
                    img_data = data[idx:end_idx + len(end_sig)]
                    if len(img_data) > 1000:  # 너무 작은 건 제외
                        found.append({
                            'data': img_data,
                            'format': fmt,
                            'stream': 'embedded'
                        })
                    start = end_idx + len(end_sig)
                else:
                    start = idx + 1
            else:
                start = idx + 1
    
    return found


# ──────────────────────────────────────────
# 3. OCR
# ──────────────────────────────────────────

def preprocess_image(img):
    """OCR 정확도를 높이기 위한 이미지 전처리"""
    from PIL import ImageFilter, ImageEnhance

    # 1. 팔레트/투명도 모드 → RGB 변환
    if img.mode not in ('RGB', 'L'):
        img = img.convert('RGB')

    # 2. 확대 (너비 1600px 기준)
    w, h = img.size
    scale = max(2.0, 1600 / w)
    img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    # 3. 대비 강화
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.8)

    # 4. 선명도 강화
    enhancer = ImageEnhance.Sharpness(img)
    img = enhancer.enhance(2.0)

    return img


def ocr_image(img_data):
    """이미지 바이너리 → OCR 텍스트 (한국어+영어, easyocr)"""
    try:
        # BytesIO 새로 생성해서 열기
        buf = io.BytesIO(bytes(img_data))
        img = Image.open(buf)
        img.load()  # 실제 데이터 로드 강제
        
        # 전처리
        img = preprocess_image(img)
        
        # numpy 배열로 변환 후 easyocr 실행
        img_np = np.array(img)
        results = OCR_READER.readtext(img_np, detail=1, paragraph=False)
        
        # 신뢰도 0.2 이상만
        lines = [text for (_, text, conf) in results if conf >= 0.2]
        return '\n'.join(lines).strip()
    
    except Exception as e:
        return f"[OCR 실패: {e}]"


# ──────────────────────────────────────────
# 4. 메인 처리
# ──────────────────────────────────────────

def process_hwp(hwp_path, output_folder=None):
    """HWP 파일 처리: 텍스트 + 이미지 추출 + OCR"""
    
    if not os.path.exists(hwp_path):
        print(f"❌ 파일 없음: {hwp_path}")
        return
    
    basename = os.path.splitext(os.path.basename(hwp_path))[0]
    
    if output_folder is None:
        output_folder = os.path.join(os.path.dirname(hwp_path), f"{basename}_추출결과")
    
    os.makedirs(output_folder, exist_ok=True)
    img_folder = os.path.join(output_folder, "images")
    os.makedirs(img_folder, exist_ok=True)
    
    print(f"\n{'='*60}")
    print(f" 처리: {os.path.basename(hwp_path)}")
    print(f"{'='*60}")
    
    ole = olefile.OleFileIO(hwp_path)
    is_compressed = check_hwp_compressed(ole)
    
    # ── 텍스트 추출
    print("\n[1/3] 텍스트 추출 중...")
    body_text, shape_text = extract_text(ole, is_compressed)
    body_text = clean_hwp_text(body_text)
    
    # ── 이미지 추출
    print("[2/3] 이미지 추출 중...")
    images = extract_images_from_ole(ole)
    ole.close()
    
    print(f"      → 이미지 {len(images)}개 발견")
    
    # ── 이미지 저장 + OCR
    print("[3/3] 이미지 저장 및 OCR 중...")
    
    ocr_results = []
    saved_images = []
    
    for i, img_info in enumerate(images, 1):
        img_filename = f"image_{i:03d}.{img_info['format']}"
        img_path = os.path.join(img_folder, img_filename)
        
        # 이미지 저장
        with open(img_path, 'wb') as f:
            f.write(img_info['data'])
        saved_images.append(img_path)
        
        # OCR
        ocr_text = ocr_image(img_info['data'])
        ocr_results.append({
            'index': i,
            'filename': img_filename,
            'text': ocr_text
        })
        
        status = "✅" if ocr_text and len(ocr_text) > 3 else "⬜ (텍스트 없음)"
        print(f"      {img_filename}: {status}")
        if ocr_text and len(ocr_text) > 3:
            preview = ocr_text[:50].replace('\n', ' ')
            print(f"           └ {preview}...")
    
    # ── 결과 저장
    
    # 1) 본문 텍스트
    text_path = os.path.join(output_folder, f"{basename}_본문.txt")
    with open(text_path, 'w', encoding='utf-8') as f:
        f.write(body_text)
    
    # 2) 도형 텍스트 (있을 때만)
    if shape_text.strip():
        shape_path = os.path.join(output_folder, f"{basename}_도형.txt")
        with open(shape_path, 'w', encoding='utf-8') as f:
            f.write(f"HWP 도형/흐름도 텍스트\n")
            f.write(f"원본 파일: {os.path.basename(hwp_path)}\n")
            f.write("="*60 + "\n\n")
            f.write(shape_text)
        print(f"      → 도형 텍스트 저장 ({shape_text.count('[도형')}개)")
    
    # 2) OCR 텍스트 (이미지별)
    ocr_path = os.path.join(output_folder, f"{basename}_이미지OCR.txt")
    with open(ocr_path, 'w', encoding='utf-8') as f:
        f.write(f"HWP 이미지 OCR 결과\n")
        f.write(f"원본 파일: {os.path.basename(hwp_path)}\n")
        f.write(f"이미지 수: {len(images)}개\n")
        f.write("="*60 + "\n\n")
        
        for r in ocr_results:
            f.write(f"[이미지 {r['index']:03d}: {r['filename']}]\n")
            f.write("-"*40 + "\n")
            if r['text']:
                f.write(r['text'])
            else:
                f.write("(텍스트 없음)")
            f.write("\n\n")
    
    # 3) 통합본 (본문 + OCR 합본)
    combined_path = os.path.join(output_folder, f"{basename}_통합.txt")
    with open(combined_path, 'w', encoding='utf-8') as f:
        f.write("【 본문 텍스트 】\n")
        f.write("="*60 + "\n")
        f.write(body_text)
        f.write("\n\n")
        
        if ocr_results:
            f.write("\n【 이미지 내 텍스트 (OCR) 】\n")
            f.write("="*60 + "\n")
            for r in ocr_results:
                if r['text'] and len(r['text']) > 3:
                    f.write(f"\n[이미지 {r['index']}]\n")
                    f.write(r['text'])
                    f.write("\n")
    
    # ── 결과 출력
    print(f"\n{'─'*60}")
    print(f"📊 결과 요약")
    print(f"{'─'*60}")
    print(f"  본문 텍스트: {len(body_text):,}자")
    print(f"  추출 이미지: {len(images)}개")
    ocr_with_text = sum(1 for r in ocr_results if r['text'] and len(r['text']) > 3)
    print(f"  OCR 성공:    {ocr_with_text}개")
    print(f"\n📁 저장 위치: {output_folder}")
    print(f"  ├ {basename}_본문.txt        (본문)")
    print(f"  ├ {basename}_이미지OCR.txt   (이미지별 OCR)")
    print(f"  ├ {basename}_통합.txt        (본문+OCR 합본)")
    print(f"  └ images/                    (이미지 파일들)")
    
    return len(images)


def process_folder(folder_path):
    """폴더 내 모든 HWP 일괄 처리"""
    
    hwp_files = [
        os.path.join(r, f)
        for r, _, files in os.walk(folder_path)
        for f in files if f.lower().endswith('.hwp')
    ]
    
    if not hwp_files:
        print("❌ HWP 파일 없음")
        return
    
    output_root = os.path.join(folder_path, "extracted_all")
    os.makedirs(output_root, exist_ok=True)
    
    print(f"총 {len(hwp_files)}개 파일 처리 시작\n")
    
    # 이미지 있는 파일 목록
    files_with_images = []
    
    for i, path in enumerate(hwp_files, 1):
        name = os.path.splitext(os.path.basename(path))[0]
        out = os.path.join(output_root, name)
        print(f"\n[{i}/{len(hwp_files)}]", end='')
        try:
            image_count = process_hwp(path, out)
            if image_count and image_count > 0:
                files_with_images.append((os.path.basename(path), image_count))
        except Exception as e:
            print(f"❌ 오류: {e}")
    
    # 이미지 있는 파일 목록 저장
    list_path = os.path.join(folder_path, "이미지_포함_파일목록.txt")
    with open(list_path, 'w', encoding='utf-8') as f:
        f.write(f"이미지가 포함된 HWP 파일 목록\n")
        f.write(f"총 {len(files_with_images)}개 / 전체 {len(hwp_files)}개\n")
        f.write("="*60 + "\n\n")
        for fname, cnt in files_with_images:
            f.write(f"[이미지 {cnt}개] {fname}\n")
    
    print(f"\n\n{'='*60}")
    print(f"✅ 이미지 포함 파일: {len(files_with_images)}개 / 전체 {len(hwp_files)}개")
    print(f"📄 목록 저장: {list_path}")
    print(f"{'='*60}")


def main():
    print("HWP 텍스트 + 이미지(OCR) 추출기")
    print("1. 단일 파일")
    print("2. 폴더 전체")
    
    choice = input("\n선택 (1 또는 2): ").strip()
    
    if choice == '1':
        path = input("HWP 파일 경로: ").strip().strip('"')
        process_hwp(path)
    else:
        folder = input("폴더 경로: ").strip().strip('"')
        process_folder(folder)


if __name__ == "__main__":
    main()