from ocr_service import ocr_service

# 테스트할 PDF 경로
pdf_path = r"C:\Users\2class_18\docmind-ai\LLM_Architecture_ChatGPT_Gemini.pdf"  # 여기에 실제 PDF 경로 넣기

result = ocr_service.extract_text_from_pdf(pdf_path)
print(result)