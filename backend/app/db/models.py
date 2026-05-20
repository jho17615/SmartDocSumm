from sqlalchemy import Column, Index, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone, timedelta
from app.db.database import Base

# 한국 시간 (KST) 설정
KST = timezone(timedelta(hours=9))

def get_now():
    # 한국 시간 (KST) 기준 현재 시간 반환
    return datetime.now(KST)

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
    email = Column(String(20), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=get_now, nullable=False)
    updated_at = Column(DateTime, default=get_now, onupdate=get_now, nullable=False)

    documents = relationship('Document', back_populates='owner', lazy=True)

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    category = Column(String(50), default="기타")
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable= False) 
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=get_now)
    updated_at = Column(DateTime, default=get_now, onupdate=get_now)

    owner = relationship("User", back_populates="documents")
    summaries = relationship("Summary", back_populates="document")


    __table_args__ = (
        # 문서 목록 조회 (가장 자주 쓰는 쿼리)
        Index("ix_document_owner_deleted", "owner_id", "is_deleted"),
        # 카테고리 필터 조회
        Index("ix_document_owner_category_deleted", "owner_id", "category", "is_deleted"),
    )

class Summary(Base):
    __tablename__ = "summaries"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    content = Column(Text, nullable=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=get_now)
    updated_at = Column(DateTime, default=get_now, onupdate=get_now)

    document = relationship("Document", back_populates="summaries")

