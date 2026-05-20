from fastapi import APIRouter, Depends, HTTPException, Cookie, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import Optional
from jose import JWTError, jwt
import shutil
import os

from app.db.database import get_db
from app.core.config import settings
from app.services.auth_service import get_user
from app.services.document_service import document_service
from app.db.document import update_document
from app.schemas.document import DocumentUpdate

router = APIRouter(prefix="/documents", tags=["documents"])



def get_current_user_id(
    access_token: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db)   
):
    if access_token is None:
        raise HTTPException(status_code=401, detail="인증 토큰이 없습니다.")
    
    try:
        payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        user = get_user(db, int(user_id))
        if user is None:
            raise HTTPException(status_code=401, detail="유저를 찾을 수 없습니다.")
        return user.id
    except JWTError:
        raise HTTPException(status_code=401, detail="토큰 검증에 실패했습니다.")


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(default=None),
    db: Session = Depends(get_db),
    owner_id: int = Depends(get_current_user_id)
):

    # 제목이 없는 경우 파일 이름에서 제목 추출
    if not title:
        title = file.filename.rsplit(".", 1)[0]  # 확장자 제거한 파일 이름을 제목으로 사용  
    # 파일 임시 저장
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try: 
        # 문서 처리
        document = document_service.process_document(
            db = db, 
            file_path = file_path,
            owner_id = owner_id,
            title = title
        )
        return {"message" : "업로드 성공", "document_id": document.id}
    
    finally:
        # 임시 파일 삭제
        if os.path.exists(file_path):
            os.remove(file_path)
        
@router.get("/list")
def get_document_list(
    db: Session = Depends(get_db),
    owner_id: int = Depends(get_current_user_id)
):
    from app.db.models import Document
    documents = db.query(Document).filter(
        Document.owner_id == owner_id,
        Document.is_deleted == False
    ).all()

    return [
        {
            "id": doc.id,
            "title": doc.title,
            "category": doc.category,
            "created_at": doc.created_at,
        } for doc in documents
    ]

@router.get("/{document_id}")
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    owner_id: int = Depends(get_current_user_id)
):
    from app.db.models import Document, Summary
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == owner_id,
        Document.is_deleted == False
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    summary = db.query(Summary).filter(
        Summary.document_id == document_id,
        Summary.is_deleted == False
    ).first()

    return {
        "id": document.id,
        "title": document.title,
        "content": document.content,
        "category": document.category,
        "created_at": document.created_at,
        "summary": summary.content if summary else None
    }


@router.put("/modify/{document_id}", status_code=status.HTTP_200_OK)
async def modify_document(
    document_id: int,
    document_data: DocumentUpdate,
    db: Session = Depends(get_db),
    owner_id: int = Depends(get_current_user_id)
):
    from app.db.models import Document, Summary
    existing = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == owner_id,
        Document.is_deleted == False
    ).first()
    if not existing:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    document = update_document(db, document_id, document_data)
    if not document:
        raise HTTPException(status_code=404, detail="수정에 실패하였습니다.")

    if document_data.summary is not None:
        summary = db.query(Summary).filter(
            Summary.document_id == document_id,
            Summary.is_deleted == False
        ).first()
        if summary:
            summary.content = document_data.summary
            db.commit()

    return document