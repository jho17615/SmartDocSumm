from sqlalchemy.orm import Session
from app.db.models import Document
from app.schemas.document import DocumentUpdate

def update_document(db: Session, id: int, document_data: DocumentUpdate):
    document = db.query(Document).filter(Document.id == id).first()
    if not document:
        return None
    
    for field, value in document_data.model_dump(exclude_unset=True, exclude={"summary"}).items():
        setattr(document, field, value)
    
    db.commit()
    db.refresh(document)
    return document