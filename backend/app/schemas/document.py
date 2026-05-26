from pydantic import BaseModel
from typing import Optional

class DocumentUpdate(BaseModel):
    category: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None  # summaries 테이블 content 필드와 매핑

class DocumentSearch(BaseModel):
    query: str
    cursor: Optional[int] = None  # 마지막 document id
    size: Optional[int] = 5