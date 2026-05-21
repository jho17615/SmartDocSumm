from sqlalchemy.orm import Session
from app.db.models import Document
from app.schemas.document import DocumentUpdate
from app.db.summary import delete_summary

def update_document(db: Session, id: int, document_data: DocumentUpdate):
    document = db.query(Document).filter(Document.id == id).first()
    if not document:
        return None
    
    for field, value in document_data.model_dump(exclude_unset=True, exclude={"summary"}).items():
        setattr(document, field, value)
    
    db.commit()
    db.refresh(document)
    return document

def delete_document(db: Session, id: int):
    document = delete_summary(db, id)
    document = db.query(Document).filter(Document.id == id).first()
    if not document:
        return None
    

    db.delete(document)
    db.commit()
    return document

def sort_document(db: Session, owner_id: int, sort: str):
    base_query = db.query(Document).filter(
        Document.owner_id == owner_id,
        Document.is_deleted == False
    )

    if sort == "latest":
        base_query = base_query.order_by(Document.created_at.desc())
    elif sort == "oldest":
        base_query = base_query.order_by(Document.created_at.asc())
    elif sort == "name-asc":
        base_query = base_query.order_by(Document.title.asc())
    elif sort == "name-desc":
        base_query = base_query.order_by(Document.title.desc())
    else:
        base_query = base_query.order_by(Document.created_at.desc())

    return base_query

def search_document(db: Session, owner_id: int, query: str):
    return db.query(Document).filter(
        Document.owner_id == owner_id,
        Document.is_deleted == False,
        Document.title.ilike(f"%{query}%")
    )