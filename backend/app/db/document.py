from sqlalchemy.orm import Session
from app.db.models import Document
from app.schemas.document import DocumentUpdate

def update_document(db: Session, id: int, document_data: DocumentUpdate):
    document = db.query(Document).filter(Document.id == id).first()
    if not document:
        return None

    for field, value in document_data.model_dump(exclude_unset=True).items():
        setattr(document, field, value)
    # document.summary = document_data.summary
    # document.title = document_data.title
    # document.category = document_data.category
    
    db.commit() 
    db.refresh(document)
    return document

def update_delete_document(db: Session, id: int):
    document = db.query(Document).filter(Document.id == id).first()
    if not document:
        return None

    document.is_deleted = True
    db.commit()
    db.refresh(document)
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

# summary 필드 추가 함수
def update_document_summary(db: Session, document_id: int, summary_content: str):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        return None
    
    document.summary = summary_content
    db.commit()
    db.refresh(document)
    return document


# document 저장 함수
def insert_document(db: Session, owner_id: int, title: str, content: str, category: str):
    document = Document(
        owner_id=owner_id,
        title=title,
        content=content,
        category=category
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document