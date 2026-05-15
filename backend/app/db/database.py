from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# DB 파일 경로 (현재 폴더에 docdb.sqlite 파일 생성)
SQLALCHEMY_DATABASE_URL = "sqlite:///./docdb.sqlite"

# 엔진 생성 (Unresolved reference 'create_engine' 해결)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# 세션 설정
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base 모델 생성
Base = declarative_base()

# DB 세션을 가져오는 의존성 함수 (main.py에서 사용)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()