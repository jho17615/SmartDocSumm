from pydantic import BaseModel
from typing import Optional

class DocumentUpdate(BaseModel):
    category: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None  # summaries 테이블 content 필드와 매핑

