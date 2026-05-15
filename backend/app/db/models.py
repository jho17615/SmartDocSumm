from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone, timedelta
from app.db.database import Base

KST = timezone(timedelta(hours=9))

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), unique=True, index=True, nullable=False)
    user_pw = Column(String(255), nullable=False) # 해싱된 비밀번호 저장
    created_at = Column(DateTime, default=lambda: datetime.now(KST))

    # 관계 설정: 유저가 가진 문서들
    documents = relationship("Document", back_populates="owner")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(500), nullable=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(KST))

    owner = relationship("User", back_populates="documents")
    summaries = relationship("Summary", back_populates="document")

class Summary(Base):
    __tablename__ = "summaries"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(KST))

    document = relationship("Document", back_populates="summaries")