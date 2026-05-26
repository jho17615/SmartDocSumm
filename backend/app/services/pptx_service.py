from backend.app.services.pptx_core import extract_text_from_pptx, format_slide_as_text


class PptxService:
    def extract_text(self, file_path: str) -> str:
        slides = extract_text_from_pptx(file_path)
        return "\n".join(format_slide_as_text(slide) for slide in slides)


pptx_service = PptxService()
