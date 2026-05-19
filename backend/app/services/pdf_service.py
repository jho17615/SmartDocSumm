import easyocr
import numpy as np
import cv2
from pdf2image import convert_from_path
from PIL import Image
from hanspell import spell_checker
import re

POPPLER_PATH =  r"C:\poppler\Library\bin"

class PDFService:
    def __init__(self):
        self.reader = easyocr.Reader(['ko', 'en'], gpu=False )
    

    def preprocess_image(self, image):
        img = np.array(image)
        gray= cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        denoised = cv2.fastNlMeansDenoising(gray, h =10)
        return Image.fromarray(denoised)
    

    # 이미지/스캔 PDF OCR 추출
    def extract_text_ocr(self, pdf_path: str) -> str:
        try:
            images = convert_from_path(pdf_path, poppler_path = POPPLER_PATH)
            full_text = ""
            for image in images:
                image = self.preprocess_image(image)
                result = self.reader.readtext(
                    np.array(image),
                    paragraph = True,  # 문단 단위로 텍스트 추출
                    contrast_ths =0.1,
                    adjust_contrast = 0.5,
                    text_threshold = 0.7,
                    low_text = 0.4,
                    width_ths = 0.7
                )
                if result:
                    text = " ".join([res[1] for res in result])
                else:
                    text = ""
                full_text += text +"\n"
            full_text = self.correct_text(full_text)
            full_text = self.postprocess_text(full_text)

            return full_text.strip()
        except Exception as e:
            print(f"Error extracting text with OCR: {e}")
            return ""
    
    def correct_text(self, text: str) -> str:
        try:
            cunk_size = 500
            cunks = [text[i:i+cunk_size] for i in range(0, len(text), cunk_size)]
            corrected = ""
            for chunk in cunks:
                result = spell_checker.check(chunk)
                corrected += result.checked
            return corrected
        except:
            return text
    
    def postprocess_text(self, text: str)  -> str:
        # 언더바 제거
        text = text.replace("_", "")
        
        # 연속 공백 제거
        text = re.sub(r' +', ' ', text)

        # 연속 줄바꿈 정리
        text = re.sub(r'\n+', '\n', text)
        return text.strip()
     
pdf_service = PDFService() 