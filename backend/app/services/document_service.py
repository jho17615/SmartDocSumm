
from sqlalchemy.orm import Session
from app.services.summary_service import summary_service   
from app.db.models import Document
from app.db.document import update_document_summary, insert_document
import ollama

class DocumentService:
    
    def __init__(self):
        self.model = "qwen2.5:3b-instruct-q4_K_S"


    def extract_content(self, file_path: str) -> str:
        if file_path.endswith(".pdf"):
            from app.services.pdf_service import pdf_service
            return pdf_service.extract_text_ocr(file_path)
        elif file_path.endswith(".docx") or file_path.endswith(".doc"):
            from app.services.docx_service import docx_service
            return docx_service.extract_text(file_path)
        elif file_path.endswith(".hwp"):
            from app.services.hwp_service import extract_text_from_hwp
            return extract_text_from_hwp(file_path)
        elif file_path.endswith(".pptx") or file_path.endswith(".ppt"):
            from app.services.pptx_service import pptx_service
            return pptx_service.extract_text(file_path)
        else:
            raise ValueError("지원하지 않는 파일 형식입니다.")
        

    def _classify_category(self, content: str, title: str) -> str:
            # 파일명으로 먼저 판단
        filename_hints = {
            "교육자료": ["과제", "수업", "강의", "학습", "조사", "레포트", "report"],
            "발표자료": ["발표", "PPT", "ppt", "슬라이드"],
            "법안": ["법안", "조례", "시행령"],
            "뉴스/기사": ["뉴스", "기사", "보도"],
            "기술문서": ["API", "개발", "기술", "spec"],
        }
        
        for category, keywords in filename_hints.items():
            if any(kw.lower() in title.lower() for kw in keywords):
                return category

        # 파일명으로 판단 못하면 모델 사용
        response = ollama.generate(
            model=self.model,
            prompt=f"""다음 텍스트의 카테고리를 아래 중 하나로만 답해. 단어 하나만 출력해.

    법안: 법률, 조항, 제X조, 시행령
    발표자료: 슬라이드, 발표, PPT
    교육자료: 강의, 학습, 수업, 교재, 과제, 조사
    기술문서: API, 코드, 시스템, 개발
    뉴스/기사: 기자, 보도, 사건, 사고
    일반문서: 보고서, 논문, 연구
    기타: 위에 해당 없음

    텍스트:
    {content[:1000]}

    카테고리:""",
            stream=False
        )

        result = response["response"].strip()
        valid = ["법안", "발표자료", "교육자료", "기술문서", "뉴스/기사", "일반문서", "기타"]
        for v in valid:
            if v in result:
                return v

        return "일반문서"
    

    def create_summary(self, content: str, category: str) -> str:
        return summary_service.summarize(content, category=category)
    
    def save_to_db(self, db: Session, owner_id: int, title: str, content: str, summary: str, category: str) -> Document:
        document = insert_document(db, owner_id, title, content, category)
        db.add(document)
        db.flush()
        update_document_summary(db, document.id, summary)
        return document
    
        


document_service = DocumentService()
