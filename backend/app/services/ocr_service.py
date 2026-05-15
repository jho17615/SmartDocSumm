from PyPDF2 import PdfReader
from pdf2image import convert_from_path
import easyocr
import numpy as np
import cv2
from PIL import Image
import re

POPPLER_PATH = r"C:\poppler\Library\bin"

class OCRService:
    def __init__(self):
        self.reader = easyocr.Reader(['ko', 'en'], gpu=False)

    def preprocess_image(self, image):
        img = np.array(image)
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        denoised = cv2.fastNlMeansDenoising(gray, h=10)
        return Image.fromarray(denoised)

    def has_images(self, page) -> bool:
        # 페이지에 이미지 객체가 있는지 확인
        try:
            if '/Resources' in page and '/XObject' in page['/Resources']:
                xobjects = page['/Resources']['/XObject'].get_object()
                for obj in xobjects.values():
                    if obj['/Subtype'] == '/Image':
                        return True
        except:
            pass
        return False

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        try:
            reader = PdfReader(pdf_path)
            images = convert_from_path(pdf_path, poppler_path=POPPLER_PATH)
            full_text = ""

            for i, page in enumerate(reader.pages):
                text = page.extract_text()

                if self.has_images(page):
                    # 이미지/구조도 있으면 OCR
                    print(f"페이지 {i+1}: 이미지 감지 → OCR")
                    image = self.preprocess_image(images[i])
                    result = self.reader.readtext(
                        np.array(image),
                        paragraph=True,
                        contrast_ths=0.1,
                        adjust_contrast=0.5,
                        text_threshold=0.7,
                        low_text=0.4,
                        width_ths=0.7
                    )
                    if result:
                        full_text += " ".join([res[1] for res in result]) + "\n"
                    # 텍스트도 있으면 추가
                    if text and text.strip():
                        full_text += text + "\n"
                else:
                    # 텍스트만 있으면 PyPDF2
                    print(f"페이지 {i+1}: 텍스트만 → PyPDF2")
                    if text and text.strip():
                        full_text += text + "\n"

            full_text = self.postprocess_text(full_text)
            return full_text.strip()

        except Exception as e:
            print(f"Error: {e}")
            return ""

    def postprocess_text(self, text: str) -> str:
        # 언더바 제거
        text = text.replace("_", " ")
        # 연속 공백 제거
        text = re.sub(r' +', ' ', text)
        # 연속 줄바꿈 정리
        text = re.sub(r'\n+', '\n', text)
        return text.strip()

ocr_service = OCRService()