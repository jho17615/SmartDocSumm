from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # JWT 설정
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # DB 설정
    DATABASE_URL: str = "mysql+pymysql://test:qwer1234@localhost:3306/docmind"

    class Config:
        env_file = ".env"

settings = Settings()