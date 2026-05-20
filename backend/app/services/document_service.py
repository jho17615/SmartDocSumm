from sqlalchemy.orm import Session
from app.services.summary_service import summary_service   
from app.db.models import Document, Summary
import ollama

class DocumentService:
    
    def __init__(self):
        self.model = "qwen2.5:3b-instruct-q4_K_S"

    def process_document(self, db: Session, file_path: str, owner_id: int, title: str) -> Document:
        # PDF에서 텍스트 추출
        try: 
            print("원문 추출 중...")

            if file_path.endswith(".pdf"):
                from app.services.pdf_service import pdf_service
                content =  pdf_service.extract_text_ocr(file_path)
            elif file_path.endswith(".docx") or file_path.endswith(".doc"):
                from app.services.docx_service import docx_service
                content = docx_service.extract_text(file_path)
            elif file_path.endswith(".hwp"):
                from app.services.hwp_service import extract_text_from_hwp
                content = extract_text_from_hwp(file_path)
            # elif file_path.endswith(".pptx") or file_path.endswith(".ppt"):
            #     from app.services.pptx_service import pptx_service
            #     content = pptx_service.extract_text(file_path)
            else:
                raise ValueError("지원하지 않는 파일 형식입니다.")


            category = self._classify_category(content)
            print(f"문서 카테고리: {category}")
            # 원문 DB 저장
            document = Document(
                owner_id=owner_id, 
                title=title, 
                category=category,
                content=content
            )

            db.add(document)
            db.flush()

            # 원문으로 요약 생성 
            summary_conent = summary_service.summarize(content)

            # 요약 DB 저장
            summary = Summary(
                document_id=document.id,
                type="전체요약",  # 예시로 type을 "전체요약"로 설정, 실제로는 SummaryType 테이블에서 적절한 값을 가져와야 함    
                content=summary_conent
            )
            db.add(summary)
            db.commit()
            db.refresh(document)
        except Exception as e:
            print(f"문서 처리 중 오류 발생: {e}")
            db.rollback()
            raise e
        
        return document
    def _classify_category(self, content: str) -> str:
        response = ollama.generate(
            model=self.model,
            prompt=f"""다음 텍스트를 읽고 아래 카테고리 중 하나로만 답해줘. 다른 말은 하지 마.
        카테고리: 법안, 발표자료, 교육자료, 기술문서, 뉴스/기사, 일반문서, 기타

        텍스트:
        {content[:500]}

        카테고리:""",
                stream=False
            )
        return response["response"].strip()


document_service = DocumentService()
