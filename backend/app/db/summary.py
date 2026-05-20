from sqlalchemy.orm import Session
from app.db.models import Summary

def delete_summary(db: Session, id: int):
    summary = db.query(Summary).filter(Summary.id == id).first()
    if not summary:
        return None
    

    db.delete(summary)
    db.commit()
    return summary
