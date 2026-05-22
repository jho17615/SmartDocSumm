# app/api/routes/upload_progress.py

import json
import os
import asyncio
import sys
import tempfile
import uuid
from fastapi import APIRouter, UploadFile, File, Form, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, Dict

from app.db.database import get_db
from app.api.routes.documents import get_current_user_id
from app.services.document_service import document_service

router = APIRouter(prefix="/upload", tags=["upload"])

# ✅ 취소 플래그 저장소
cancel_flags: Dict[str, bool] = {}

SUPPORTED_EXTENSIONS = [".pdf", ".doc", ".docx", ".hwp", ".ppt", ".pptx"]

def make_event(stage: str, progress: int, message: str, **kwargs) -> str:
    """SSE 이벤트 생성 헬퍼"""
    data = {"stage": stage, "progress": progress, "message": message, **kwargs}
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

def make_cancelled_event() -> str:
    return make_event("cancelled", 0, "❌ 분석이 취소되었습니다.")

def make_error_event(message: str) -> str:
    return make_event("error", 0, f"❌ {message}")

@router.post("/cancel/{task_id}")
async def cancel_upload(task_id: str):
    """진행 중인 업로드 작업 취소 요청"""
    cancel_flags[task_id] = True
    print(f"⚠️ 작업 {task_id} 취소 요청됨")
    return {"message": "취소 요청됨", "task_id": task_id}

@router.post("/progress")
async def upload_with_progress(
    file: UploadFile = File(...),
    title: Optional[str] = Form(default=None),
    db: Session = Depends(get_db),
    owner_id: int = Depends(get_current_user_id)
):
    # ✅ 고유 작업 ID 생성
    task_id = str(uuid.uuid4())
    
    async def event_generator():
        tmp_file_path = None

        try: 
            def is_cancelled() -> bool:
                if cancel_flags.get(task_id, False):
                    print(f"⚠️ 작업 {task_id} 취소됨! 분석 중단")
                    return True
                return False
            
            # 1. 파일 확장자 검증
            ext = os.path.splitext(file.filename)[1].lower()
            if ext not in SUPPORTED_EXTENSIONS:
                yield make_error_event("지원하지 않는 파일 형식입니다.")
                return
            
            # 2. 파일 읽기
            yield make_event("save", 10, "📁 파일 읽는 중...")
            if is_cancelled():
                yield make_cancelled_event()
                return
            
            file_bytes = await file.read()
            yield make_event("save", 30, "✅ 파일 읽기 완료")

            # 3. 임시 파일 저장
            with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp_file:
                tmp_file.write(file_bytes)
                tmp_file_path = tmp_file.name

            # 4. 텍스트 추출
            yield make_event("extract", 35, "📄 텍스트 추출 중...")
            if is_cancelled():
                yield make_cancelled_event()
                return
            
            try:
                content = document_service.extract_content(tmp_file_path)
            except ValueError as e:
                yield make_error_event(str(e))
                return
            
            if not content or len(content.strip()) == 0:
                yield make_error_event("문서에서 텍스트를 추출할 수 없습니다.")
                return
            
            yield make_event("extract", 50, f"📄 텍스트 추출 완료 ({len(content)}자)")

            # 5. 카테고리 분류
            if is_cancelled():
                yield make_cancelled_event()
                return  
            yield make_event("classify", 55, "🏷️ 카테고리 분류 중... (AI)")
            category = document_service._classify_category(content, title = tmp_file_path or file.filename)  # 파일명도 같이 넘겨서 분류 정확도 향상
            yield make_event("classify", 65, f"✅ 카테고리: {category}")

            # 6. 요약 생성
            if is_cancelled():
                yield make_cancelled_event()
                return
            
            yield make_event("summarize", 70, "🤖 AI 요약 생성 중...")
            summary = document_service.create_summary(content, category)

            if is_cancelled():
                yield make_cancelled_event()
                return  
            
            yield make_event("summarize", 90, "✅ AI 요약 완료")

            # 7. DB 저장
            yield make_event("save_db", 93, "💾 데이터베이스 저장 중...")
            document = document_service.save_to_db(db, owner_id, title or file.filename, content, summary, category)
        
            # 8. 완료
            yield make_event("done", 100, "🎉 분석 완료!", document_id=document.id)

        except Exception as e:
            print(f"업로드 처리 중 오류 발생: {e}")
            yield make_error_event("업로드 처리 중 오류가 발생했습니다.")
            try:                      
                db.rollback()
            except:
                pass

        finally:
            # ✅ 임시 파일 정리
            if tmp_file_path and os.path.exists(tmp_file_path):
                try:
                    os.unlink(tmp_file_path)
                except:
                    pass
            
            #취소 플래그 정리
            cancel_flags.pop(task_id, None)
            
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "X-Task-Id": task_id,  # 프론트에 task_id 전달
        }
    )
    
