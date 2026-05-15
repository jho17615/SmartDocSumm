from fastapi import FastAPI                             #0
from app.core.database import Base, engine              #1
from app.model import user                              #1
from pydantic import BaseModel                          #2
from sqlalchemy.orm import Session                      #3
from fastapi import Depends                             #3
from app.services import auth_service                   #3
from app.core.database import get_db                    #3
from fastapi.security import OAuth2PasswordRequestForm  #4
from backend.app.api import ocr

#0
app = FastAPI(title="문서 요약 및 검색 서비스 API")

#1
Base.metadata.create_all(bind=engine)

#2 :: 프론트에서 받은 json 형식 데이터를 이 객체로 변환
class RegisterRequest(BaseModel):
    user_id: str
    user_pw: str
      
app.include_router(ocr.router)

#3 :: 회원가입 :: #2에서 변환한 데이터를 auth_service로 전송, 세션+
@app.post("/user/join")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    return auth_service.register(db=db, user_id=request.user_id, user_pw=request.user_pw)

#4 :: 로그인 :: 프론트에서 로그인 시도 데이터를 받아서 auth_service.login로 전송&확인 후 토큰 토스받기
@app.post("/user/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    token = auth_service.login(db=db, user_id=form_data.username, user_pw=form_data.password)
    return {"access_token": token, "token_type": "bearer"}
    
 

@app.get("/")
async def root():
    return {"message": "서버가 정상 가동 중입니다. /docs 에서 테스트해 보세요!"}



