# app/api/routes/upload_progress.py

import json
import os
import asyncio
import sys
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.api.routes.documents import get_current_user_id
from app.services.document_service import document_service

router = APIRouter(prefix="/upload", tags=["upload"])

@router.post("/progress")
async def upload_with_progress(
    file: UploadFile = File(...),
    title: Optional[str] = Form(default=None),
    db: Session = Depends(get_db),
    owner_id: int = Depends(get_current_user_id)
):
    async def event_generator():
        
        def show_progress(percent: int, message: str):
            bar_length = 30
            filled = int(bar_length * percent // 100)
            bar = "█" * filled + "░" * (bar_length - filled)
            print(f"[{bar}] {percent:3d}% - {message}")
        
        # 1. 파일 읽기
        show_progress(10, "📁 파일 읽는 중...")
        yield f"data: {json.dumps({'stage': 'save', 'progress': 10, 'message': '📁 파일 읽는 중...'})}\n\n"
        await asyncio.sleep(0.1)

        file_bytes = await file.read()

        show_progress(30, "✅ 파일 읽기 완료")
        yield f"data: {json.dumps({'stage': 'save', 'progress': 30, 'message': '✅ 파일 읽기 완료'})}\n\n"
        await asyncio.sleep(0.1)

        # 2. 텍스트 추출
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
                show_progress(50, f"📄 PDF 텍스트 추출 완료 ({len(content)}자)")
                yield f"data: {json.dumps({'stage': 'extract', 'progress': 50, 'message': f'📄 PDF 텍스트 추출 완료'})}\n\n"
                
            elif file.filename.endswith((".doc", ".docx")):
                from app.services.docx_service import docx_service
                with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp_file:
                    tmp_file.write(file_bytes)
                    tmp_file_path = tmp_file.name
                content = docx_service.extract_text(tmp_file_path)
                show_progress(50, f"📝 Word 텍스트 추출 완료 ({len(content)}자)")
                yield f"data: {json.dumps({'stage': 'extract', 'progress': 50, 'message': f'📝 Word 텍스트 추출 완료'})}\n\n"
                
            elif file.filename.endswith(".hwp"):
                from app.services.hwp_service import extract_text_from_hwp
                with tempfile.NamedTemporaryFile(delete=False, suffix=".hwp") as tmp_file:
                    tmp_file.write(file_bytes)
                    tmp_file_path = tmp_file.name
                content = extract_text_from_hwp(tmp_file_path)
                show_progress(50, f"📄 HWP 텍스트 추출 완료 ({len(content)}자)")
                yield f"data: {json.dumps({'stage': 'extract', 'progress': 50, 'message': f'📄 HWP 텍스트 추출 완료'})}\n\n"
            else:
                raise ValueError("지원하지 않는 파일 형식입니다")
                
        finally:
            if tmp_file_path and os.path.exists(tmp_file_path):
                try:
                    os.unlink(tmp_file_path)
                except:
                    pass

        await asyncio.sleep(0.1)

        # 3. 카테고리 분류 (한 줄)
        show_progress(55, "🏷️ 카테고리 분류 중... (AI)")
        await asyncio.sleep(0.5)
        
        category = document_service._classify_category(content)

        show_progress(65, f"✅ 카테고리: {category}")
        yield f"data: {json.dumps({'stage': 'classify', 'progress': 65, 'message': f'✅ 카테고리: {category}'})}\n\n"
        await asyncio.sleep(0.1)

        # 4. 요약 생성 (한 줄)
        show_progress(70, "🤖 AI 요약 생성 중...")
        await asyncio.sleep(0.5)

        from app.services.summary_service import summary_service
        summary = summary_service.summarize(content, category=category)

        show_progress(90, "✅ AI 요약 완료")
        yield f"data: {json.dumps({'stage': 'summarize', 'progress': 90, 'message': '✅ AI 요약 완료'})}\n\n"
        await asyncio.sleep(0.1)

        # 5. DB 저장 (한 줄)
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
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )