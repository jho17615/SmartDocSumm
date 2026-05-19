from fastapi import APIRouter, Depends, HTTPException, status, Cookie
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
from typing import Optional
from app.core.config import settings 
import os

from app.db.database import get_db
from app.schemas.user import Token, UserCreate, RefreshTokenRequest
from app.services.auth_service import get_user_by_email, create_user
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
    get_current_active_user
)

router = APIRouter(prefix="/auth", tags=["auth"])



class UserResponse(BaseModel):
    id: int # ID는 Integer입니다.
    email: str
    name: str # username 대신 name 사용
    class Config:
        from_attributes = True

    
@router.get("/me", response_model=UserResponse)
async def get_me(
    access_token: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db)
):
    print("test")
    if access_token is None:
        raise HTTPException(status_code=401, detail="인증 토큰이 없습니다.")
 
    try:
        # 2. settings 속성 이름을 SECRET_KEY, ALGORITHM으로 올바르게 수정
        payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        
        from app.services.auth_service import get_user
        user = get_user(db, int(user_id))
        if not user:
            raise HTTPException(status_code=401, detail="유저를 찾을 수 없습니다.")
 
        return user
 
    except JWTError:
        raise HTTPException(status_code=401, detail="토큰 검증에 실패했습니다.")


@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    if get_user_by_email(db, user.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 존재하는 이메일입니다"
        )
    return create_user(db, user)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

from fastapi import Response

@router.post("/login")
def login(
    login_data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    user = get_user_by_email(db, login_data.email)
    if not user or not verify_password(login_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다"
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,       # 개발환경은 HTTP이므로 False
        samesite="lax",
        max_age=60 * 30,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,       # 개발환경은 HTTP이므로 False
        samesite="lax",
        max_age=60 * 60 * 24 * 7,
    )

    return {"message": "로그인 성공"}

@router.post("/refresh", response_model=Token)
def refresh_token(request: RefreshTokenRequest):
    payload = verify_token(request.refresh_token, token_type="refresh")
    user_id = payload.get("sub")
    access_token = create_access_token(data={"sub": user_id})
    refresh_token = create_refresh_token(data={"sub": user_id})
    return Token(access_token=access_token, refresh_token=refresh_token)

# @router.get("/me", response_model=UserResponse)
# def get_me(current_user=Depends(get_current_active_user)):
#     return current_user


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token", httponly=True, samesite="lax")
    response.delete_cookie(key="refresh_token", httponly=True, samesite="lax")
    return {"message": "로그아웃 성공"}