
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

            print("원문 추출 완료")
            category = self._classify_category(content, title)
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
            summary_conent = summary_service.summarize(content, category= category)

            # 요약 DB 저장
            summary = Summary(
                document_id=document.id,
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


document_service = DocumentService()
