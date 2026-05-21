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
        
        def show_progress(percent: int, message: str):
            bar_length = 30
            filled = int(bar_length * percent // 100)
            bar = "█" * filled + "░" * (bar_length - filled)
            print(f"[{bar}] {percent:3d}% - {message}")
        
        # ✅ 취소 확인 함수
        def check_cancelled():
            if cancel_flags.get(task_id, False):
                print(f"⚠️ 작업 {task_id} 취소됨! 분석 중단")
                return True
            return False
        
        try:
            # 1. 파일 읽기
            if check_cancelled():
                yield f"data: {json.dumps({'stage': 'cancelled', 'progress': 0, 'message': '❌ 분석이 취소되었습니다.'})}\n\n"
                return
            
            show_progress(10, "📁 파일 읽는 중...")
            yield f"data: {json.dumps({'stage': 'save', 'progress': 10, 'message': '📁 파일 읽는 중...'})}\n\n"
            await asyncio.sleep(0.1)

            file_bytes = await file.read()
            
            if check_cancelled():
                yield f"data: {json.dumps({'stage': 'cancelled', 'progress': 0, 'message': '❌ 분석이 취소되었습니다.'})}\n\n"
                return

            show_progress(30, "✅ 파일 읽기 완료")
            yield f"data: {json.dumps({'stage': 'save', 'progress': 30, 'message': '✅ 파일 읽기 완료'})}\n\n"
            await asyncio.sleep(0.1)

            # 2. 텍스트 추출
            if check_cancelled():
                yield f"data: {json.dumps({'stage': 'cancelled', 'progress': 0, 'message': '❌ 분석이 취소되었습니다.'})}\n\n"
                return
            
            show_progress(35, "📄 텍스트 추출 중...")
            yield f"data: {json.dumps({'stage': 'extract', 'progress': 35, 'message': '📄 텍스트 추출 중...'})}\n\n"

            content = ""
            tmp_file_path = None
            
            try:
                if file.filename.endswith(".pdf"):
                    from app.services.pdf_service import pdf_service
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
                        tmp_file.write(file_bytes)
                        tmp_file_path = tmp_file.name
                    content = pdf_service.extract_text_ocr(tmp_file_path)
                    
                    if check_cancelled():
                        yield f"data: {json.dumps({'stage': 'cancelled', 'progress': 0, 'message': '❌ 분석이 취소되었습니다.'})}\n\n"
                        return
                        
                    show_progress(50, f"📄 PDF 텍스트 추출 완료 ({len(content)}자)")
                    yield f"data: {json.dumps({'stage': 'extract', 'progress': 50, 'message': f'📄 PDF 텍스트 추출 완료'})}\n\n"
                    
                elif file.filename.endswith((".doc", ".docx")):
                    from app.services.docx_service import docx_service
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp_file:
                        tmp_file.write(file_bytes)
                        tmp_file_path = tmp_file.name
                    content = docx_service.extract_text(tmp_file_path)
                    
                    if check_cancelled():
                        yield f"data: {json.dumps({'stage': 'cancelled', 'progress': 0, 'message': '❌ 분석이 취소되었습니다.'})}\n\n"
                        return
                        
                    show_progress(50, f"📝 Word 텍스트 추출 완료 ({len(content)}자)")
                    yield f"data: {json.dumps({'stage': 'extract', 'progress': 50, 'message': f'📝 Word 텍스트 추출 완료'})}\n\n"
                    
                elif file.filename.endswith(".hwp"):
                    from app.services.hwp_service import extract_text_from_hwp
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".hwp") as tmp_file:
                        tmp_file.write(file_bytes)
                        tmp_file_path = tmp_file.name
                    content = extract_text_from_hwp(tmp_file_path)

                    if check_cancelled():
                        yield f"data: {json.dumps({'stage': 'cancelled', 'progress': 0, 'message': '❌ 분석이 취소되었습니다.'})}\n\n"
                        return

                    show_progress(50, f"📄 HWP 텍스트 추출 완료 ({len(content)}자)")
                    yield f"data: {json.dumps({'stage': 'extract', 'progress': 50, 'message': f'📄 HWP 텍스트 추출 완료'})}\n\n"

                elif file.filename.endswith((".pptx", ".ppt")):
                    from app.services.pptx_service import pptx_service
                    suffix = ".pptx" if file.filename.endswith(".pptx") else ".ppt"
                    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
                        tmp_file.write(file_bytes)
                        tmp_file_path = tmp_file.name
                    content = pptx_service.extract_text(tmp_file_path)

                    if check_cancelled():
                        yield f"data: {json.dumps({'stage': 'cancelled', 'progress': 0, 'message': '❌ 분석이 취소되었습니다.'})}\n\n"
                        return

                    show_progress(50, f"📊 PPT 텍스트 추출 완료 ({len(content)}자)")
                    yield f"data: {json.dumps({'stage': 'extract', 'progress': 50, 'message': f'📊 PPT 텍스트 추출 완료'})}\n\n"

                else:
                    raise ValueError("지원하지 않는 파일 형식입니다")
                    
            finally:
                if tmp_file_path and os.path.exists(tmp_file_path):
                    try:
                        os.unlink(tmp_file_path)
                    except:
                        pass

            await asyncio.sleep(0.1)

            # 3. 카테고리 분류
            if check_cancelled():
                yield f"data: {json.dumps({'stage': 'cancelled', 'progress': 0, 'message': '❌ 분석이 취소되었습니다.'})}\n\n"
                return
            
            show_progress(55, "🏷️ 카테고리 분류 중... (AI)")
            yield f"data: {json.dumps({'stage': 'classify', 'progress': 55, 'message': '🏷️ 카테고리 분류 중... (AI)'})}\n\n"
            await asyncio.sleep(0.5)
            
            category = document_service._classify_category(content, title = tmp_file_path or file.filename)  # 파일명도 같이 넘겨서 분류 정확도 향상
            
            if check_cancelled():
                yield f"data: {json.dumps({'stage': 'cancelled', 'progress': 0, 'message': '❌ 분석이 취소되었습니다.'})}\n\n"
                return

            show_progress(65, f"✅ 카테고리: {category}")
            yield f"data: {json.dumps({'stage': 'classify', 'progress': 65, 'message': f'✅ 카테고리: {category}'})}\n\n"
            await asyncio.sleep(0.1)

            # 4. 요약 생성
            if check_cancelled():
                yield f"data: {json.dumps({'stage': 'cancelled', 'progress': 0, 'message': '❌ 분석이 취소되었습니다.'})}\n\n"
                return
            
            show_progress(70, "🤖 AI 요약 생성 중...")
            yield f"data: {json.dumps({'stage': 'summarize', 'progress': 70, 'message': '🤖 AI 요약 생성 중...'})}\n\n"

            from app.services.summary_service import summary_service
            summary = summary_service.summarize(content, category=category)
            
            if check_cancelled():
                yield f"data: {json.dumps({'stage': 'cancelled', 'progress': 0, 'message': '❌ 분석이 취소되었습니다.'})}\n\n"
                return

            show_progress(90, "✅ AI 요약 완료")
            yield f"data: {json.dumps({'stage': 'summarize', 'progress': 90, 'message': '✅ AI 요약 완료'})}\n\n"
            await asyncio.sleep(0.1)

            # 5. DB 저장
            if check_cancelled():
                yield f"data: {json.dumps({'stage': 'cancelled', 'progress': 0, 'message': '❌ 분석이 취소되었습니다.'})}\n\n"
                return
            
            show_progress(93, "💾 데이터베이스 저장 중...")
            yield f"data: {json.dumps({'stage': 'save_db', 'progress': 93, 'message': '💾 데이터베이스 저장 중...'})}\n\n"
            await asyncio.sleep(0.5)

            from app.db.models import Document, Summary
            document = Document(
                owner_id=owner_id,
                title=title or file.filename,
                category=category,
                content=content
            )
            db.add(document)
            db.flush()

            summary_obj = Summary(
                document_id=document.id,
                content=summary
            )
            db.add(summary_obj)
            db.commit()
            db.refresh(document)

            show_progress(100, "🎉 분석 완료!")
            print()
            yield f"data: {json.dumps({'stage': 'done', 'progress': 100, 'message': '🎉 분석 완료!', 'document_id': document.id})}\n\n"
            
        finally:
            # ✅ 작업 완료/취소 후 플래그 정리
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