from fastapi import APIRouter, Depends, HTTPException, Cookie, UploadFile, File, Form, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from jose import JWTError, jwt
import shutil
import os

from app.db.database import get_db
from app.core.config import settings
from app.services.auth_service import get_user
from app.services.document_service import document_service
from app.db.document import update_document, delete_document, sort_document, search_document 
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
    if not title:
        title = file.filename.rsplit(".", 1)[0]
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try: 
        document = document_service.process_document(
            db=db, 
            file_path=file_path,
            owner_id=owner_id,
            title=title
        )
        return {"message": "업로드 성공", "document_id": document.id}
    
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


# ✅ 페이징 처리 추가
@router.get("/list")
def get_document_list(
    page: int = Query(default=1, ge=1, description="페이지 번호 (1부터 시작)"),
    size: int = Query(default=5, ge=1, le=50, description="페이지당 문서 수"),
    db: Session = Depends(get_db),
    owner_id: int = Depends(get_current_user_id)
):
    from app.db.models import Document

    base_query = db.query(Document).filter(
        Document.owner_id == owner_id,
        Document.is_deleted == False
    )

    total = base_query.count()
    total_pages = (total + size - 1) // size  # ceil 나눗셈

    documents = (
        base_query
        .order_by(Document.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    return {
        "items": [
            {
                "id": doc.id,
                "title": doc.title,
                "category": doc.category,
                "created_at": doc.created_at,
            }
            for doc in documents
        ],
        "total": total,
        "page": page,
        "size": size,
        "total_pages": total_pages,
    }


@router.get("/list/sort")
def sort_document_list(
    sort: str = Query(default="latest"),
    page: int = Query(default=1, ge=1, description="페이지 번호 (1부터 시작)"),
    size: int = Query(default=5, ge=1, le=50, description="페이지당 문서 수"),
    db: Session = Depends(get_db),
    owner_id: int = Depends(get_current_user_id)
):
    base_query = sort_document(db, owner_id, sort)

    total = base_query.count()
    total_pages = (total + size - 1) // size

    documents = (
        base_query
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    return {
        "items": [
            {
                "id": doc.id,
                "title": doc.title,
                "category": doc.category,
                "created_at": doc.created_at,
            }
            for doc in documents
        ],
        "total": total,
        "page": page,
        "size": size,
        "total_pages": total_pages,
    }


@router.get("/category-counts")
async def get_category_counts(
    db: Session = Depends(get_db),
    owner_id: int = Depends(get_current_user_id),
):
    from app.db.models import Document
    from sqlalchemy import func

    results = (
        db.query(Document.category, func.count(Document.id))
        .filter(Document.owner_id == owner_id, Document.is_deleted == False)
        .group_by(Document.category)
        .all()
    )

    return {category: count for category, count in results}


@router.get("/search")
async def search_documents(
    query: str = Query(..., description="검색어"),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=5, ge=1, le=50),
    db: Session = Depends(get_db),
    owner_id: int = Depends(get_current_user_id),
):
    base_query = search_document(db, owner_id, query)

    total = base_query.count()
    total_pages = (total + size - 1) // size

    documents = (
        base_query
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    return {
        "items": [
            {
                "id": doc.id,
                "title": doc.title,
                "category": doc.category,
                "created_at": doc.created_at,
            }
            for doc in documents
        ],
        "total": total,
        "page": page,
        "size": size,
        "total_pages": total_pages,
    }


@router.get("/category")
async def get_documents_by_category(
    category: str = Query(..., description="카테고리"),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=5, ge=1, le=50),
    db: Session = Depends(get_db),
    owner_id: int = Depends(get_current_user_id),
):
    from app.db.models import Document

    base_query = db.query(Document).filter(
        Document.owner_id == owner_id,
        Document.is_deleted == False,
        Document.category == category,
    )

    total = base_query.count()
    total_pages = (total + size - 1) // size

    documents = (
        base_query
        .order_by(Document.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    return {
        "items": [
            {
                "id": doc.id,
                "title": doc.title,
                "category": doc.category,
                "created_at": doc.created_at,
            }
            for doc in documents
        ],
        "total": total,
        "page": page,
        "size": size,
        "total_pages": total_pages,
    }


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
):
    from app.db.models import Summary

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


@router.delete("/delete/{document_id}", status_code=status.HTTP_200_OK)
async def delete_document_route(
    document_id: int,
    db: Session = Depends(get_db),
):
    document = delete_document(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="삭제에 실패하였습니다.")

    return document