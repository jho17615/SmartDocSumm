from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # JWT 설정
    SECRET_KEY: str 
    ALGORITHM: str 
    ACCESS_TOKEN_EXPIRE_MINUTES: int    
    REFRESH_TOKEN_EXPIRE_DAYS: int
    POPPLER_PATH: str

    # DB 설정
    DATABASE_URL: str

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()