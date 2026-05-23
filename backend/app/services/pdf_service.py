import easyocr
import numpy as np
import cv2
from pdf2image import convert_from_path
from pypdf import PdfReader
from PIL import Image
from hanspell import spell_checker
import re
from app.core.config import settings

POPPLER_PATH = settings.POPPLER_PATH

class PDFService:
    def __init__(self):
        self.reader = easyocr.Reader(['ko', 'en'], gpu=False)
    
    def preprocess_image(self, image):
        img = np.array(image)
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        denoised = cv2.fastNlMeansDenoising(gray, h=10)
        return Image.fromarray(denoised)
    
    def has_images(self, page) -> bool:
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
                    print(f"페이지 {i+1}: 이미지 감지 → OCR")
                    image = self.preprocess_image(images[i])
                    result = self.reader.readtext(
                        np.array(image),
                        paragraph=True,
                        contrast_ths=0.1,
                        adjust_contrast=0.5,
                        text_threshold=0.7,
                        low_text=0.4,
