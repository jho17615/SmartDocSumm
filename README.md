


<img width="960" height="540" alt="슬라이드1" src="https://github.com/user-attachments/assets/ea23af6b-66d7-439e-be3e-f2444621cd43" />
<img width="960" height="540" alt="슬라이드2" src="https://github.com/user-attachments/assets/1f1f0b92-b265-4439-81f9-0790b10c595d" />
<img width="960" height="540" alt="슬라이드3" src="https://github.com/user-attachments/assets/a93311b3-67c2-463d-8a44-2cd147decb26" />
<img width="960" height="540" alt="슬라이드4" src="https://github.com/user-attachments/assets/837f984c-a7d6-4926-afa0-80bfcb6f7635" />
<img width="960" height="540" alt="슬라이드5" src="https://github.com/user-attachments/assets/7fad6b7d-1fd8-46e2-9df0-00a7ef27a784" />
<img width="960" height="540" alt="슬라이드6" src="https://github.com/user-attachments/assets/aa5e14db-554a-4b0a-8c3b-597dd08a9b15" />
<img width="960" height="540" alt="슬라이드7" src="https://github.com/user-attachments/assets/ee0f88de-32ea-4261-a66e-ca20b34c12c4" />
<img width="960" height="540" alt="슬라이드8" src="https://github.com/user-attachments/assets/8eb9e079-3d4c-4e3d-b9c0-f77a02182491" />
<img width="960" height="540" alt="슬라이드9" src="https://github.com/user-attachments/assets/7cd893a0-1d1b-41a8-b98a-0436415c48a9" />
<img width="960" height="540" alt="슬라이드10" src="https://github.com/user-attachments/assets/0df397ec-11b6-482f-86e6-868e4e6b8ef4" />
<img width="960" height="540" alt="슬라이드11" src="https://github.com/user-attachments/assets/fe390a94-f74c-4118-8c56-df7772f7db62" />
<img width="960" height="540" alt="슬라이드12" src="https://github.com/user-attachments/assets/200dea77-6a65-4137-912a-24d79d240e1c" />
<img width="960" height="540" alt="슬라이드13" src="https://github.com/user-attachments/assets/43bc1e09-c28c-4a67-9f99-89369c41b0d3" />
<img width="960" height="540" alt="슬라이드14" src="https://github.com/user-attachments/assets/ae409f40-5d05-4ac1-876d-046a2e0d3a41" />
<img width="960" height="540" alt="슬라이드15" src="https://github.com/user-attachments/assets/7b8c1ee8-330b-40b1-a16c-63106c2aba00" />
<img width="960" height="540" alt="슬라이드16" src="https://github.com/user-attachments/assets/a310bfab-dfb6-4668-9438-a386bbaac49b" />
<img width="960" height="540" alt="슬라이드17" src="https://github.com/user-attachments/assets/15b5601f-c676-406c-8e64-40f86c372693" />
<img width="960" height="540" alt="슬라이드18" src="https://github.com/user-attachments/assets/6b51262a-b7c6-435f-8422-616158e921c7" />
<img width="960" height="540" alt="슬라이드19" src="https://github.com/user-attachments/assets/5ab0a7b1-a1a8-4976-a498-81acd7a8cba6" />
<img width="960" height="540" alt="슬라이드20" src="https://github.com/user-attachments/assets/e32e221a-5e2d-40ff-8bfe-16a180b06e6d" />
<img width="960" height="540" alt="슬라이드21" src="https://github.com/user-attachments/assets/a2a99a36-c112-4114-95a6-cb555384115d" />
# 🤖 AI ENGINE — 멀티포맷 AI 문서 관리 플랫폼

> PDF, DOCX, HWP, PPTX 등 다양한 포맷의 문서를 업로드하면 AI가 자동으로 텍스트를 추출하고 카테고리를 분류한 뒤 맞춤형 요약을 생성·저장하는 풀스택 웹 서비스

---

## 📌 프로젝트 개요

조직 내 PDF·DOCX·HWP·PPTX 등 6종 이상의 포맷이 혼재하고, 핵심 요약 부재로 문서 파악에 평균 30~50분이 소요되는 문제를 해결합니다.
업로드 즉시 온프레미스 AI(Ollama)가 자동으로 텍스트를 추출·분류·요약하여 데이터 유출 없이 안전하게 관리합니다.

| 지표 | 내용 |
|------|------|
| 지원 포맷 | PDF, DOCX, DOC, HWP, PPTX, PPT — **6종** |
| 처리 파이프라인 | 업로드 → 추출 → 분류 → 요약 → 저장 — **5단계 SSE 스트리밍** |
| AI 분류 카테고리 | 법안 / 발표자료 / 교육자료 / 기술문서 / 뉴스·기사 / 일반문서 / 기타 — **7개** |

---

## 🗂️ 프로젝트 구조

```
ai-engine/
├── backend/
│   ├── app/
│   │   ├── api/routes/
│   │   │   ├── auth.py            # 인증 (회원가입·로그인·로그아웃·JWT 갱신)
│   │   │   ├── documents.py       # 문서 CRUD, 정렬, 검색, 페이징
│   │   │   └── upload_progress.py # SSE 스트리밍 업로드 + 취소
│   │   ├── core/
│   │   │   ├── config.py          # 환경변수 설정
│   │   │   └── security.py        # JWT 발급·검증, bcrypt
│   │   ├── db/
│   │   │   ├── models.py          # User, Document SQLAlchemy 모델
│   │   │   ├── database.py        # DB 연결·세션
│   │   │   └── document.py        # 문서 DB 쿼리 함수
│   │   ├── services/
│   │   │   ├── document_service.py  # 포맷별 텍스트 추출 라우팅, 카테고리 분류
│   │   │   ├── summary_service.py   # 청킹·병렬 요약·후처리
│   │   │   ├── pdf_service.py       # pdfplumber + EasyOCR 하이브리드 추출
│   │   │   ├── hwp_service.py       # HWP OLE 바이너리 파싱 + 도형 OCR
│   │   │   ├── docx_service.py      # python-docx 추출
│   │   │   └── pptx_service.py      # python-pptx 추출
│   │   └── main.py                # FastAPI 앱 진입점
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── components/
    │   │   │   ├── Dashboard.tsx      # 메인 대시보드 (문서 목록·업로드·검색)
    │   │   │   ├── PDFDetailView.tsx  # 문서 상세·요약 편집
    │   │   │   └── ui/                # shadcn/ui 공통 컴포넌트
    │   │   ├── api/
    │   │   │   ├── auth.ts            # 인증 API 클라이언트
    │   │   │   ├── document.ts        # 문서 API 클라이언트
    │   │   │   └── client.ts          # 공통 fetch 래퍼
    │   │   └── App.tsx
    │   └── styles/
    ├── vite.config.ts             # Vite 설정 + /api 프록시
    └── package.json
```

---

## ✨ 주요 기능

### 1. 5단계 실시간 SSE 스트리밍

Server-Sent Events로 처리 진행률을 프론트에 실시간 전달합니다.

```
파일 업로드(10~30%) → 텍스트 추출(35~50%) → 카테고리 분류(55~65%)
  → AI 요약 생성(70~90%) → DB 저장(93%) → 완료(100%)
```

- **프론트 취소**: `AbortController`로 fetch·SSE 연결 즉시 중단
- **백엔드 취소 보장**: `task_id` 기반 `cancel_flags` 딕셔너리로 각 단계 진입 전 `check_cancelled()` 호출

### 2. 포맷별 텍스트 추출

| 포맷 | 추출 방식 |
|------|-----------|
| PDF | pdfplumber(텍스트·표) + 이미지 페이지만 EasyOCR (하이브리드) |
| DOCX / DOC | python-docx |
| HWP | OLE 바이너리 직접 파싱 (본문 TAG 67 + 도형 TAG 71 + 표) + EasyOCR |
| PPTX / PPT | python-pptx |

### 3. AI 카테고리 분류

파일명 키워드 우선 판단 → 판단 불가 시 Ollama 모델로 분류

```python
filename_hints = {
    "교육자료": ["과제", "수업", "강의", "학습", "조사", "레포트"],
    "발표자료": ["발표", "PPT", "슬라이드"],
    "법안":     ["법안", "조례", "시행령"],
    ...
}
# 매칭 실패 시 → ollama.generate() 로 7개 카테고리 중 선택
```

### 4. AI 요약 파이프라인 (4단계)

```
① 문서 청킹  : 문장 부호·공백 기준 분할, 최대 10개 균등 청크
② 병렬 요약  : ThreadPoolExecutor(max_workers=3) — 최대 3청크 동시 처리
               temperature=0.05, num_predict=150
③ 최종 요약  : 카테고리별 프롬프트 적용
               법안·교육: 번호(1.2.3.) / 기술문서: 불릿(•) / 뉴스·일반: 문단
               temperature=0.1, num_predict=1000
④ 후처리 정제: 마크다운·출력 태그·각주 번호 제거
```

### 5. CRUD 기반 문서 관리

| 기능 | API | 설명 |
|------|-----|------|
| 업로드·분석 | `POST /upload/progress` | SSE 스트리밍, 멀티포맷 지원 |
| 목록 조회 | `GET /documents/list` | 페이지네이션(기본 5건) |
| 정렬 | `GET /documents/list/sort` | latest / oldest / name-asc / name-desc |
| 검색 | `GET /documents/search` | 제목 부분 일치(ilike) |
| 카테고리 필터 | `GET /documents/category` | 7개 카테고리 |
| 상세 조회 | `GET /documents/{id}` | 요약·본문·메타데이터 |
| 수정 | `PATCH /documents/{id}` | 요약·카테고리 직접 편집 |
| 삭제 | `DELETE /documents/{id}` | soft delete (is_deleted=True) |
| 업로드 취소 | `POST /upload/cancel/{task_id}` | 서버 AI 작업 즉시 중단 |

---

## 🏗️ 시스템 아키텍처

```
[React 18 + TypeScript]  ←──SSE / HTTP──→  [FastAPI 비동기 서버]
  TailwindCSS v4                               SQLAlchemy ORM
  shadcn/ui                                    Pydantic v2
  Vite (프록시 /api → :8000)                  │
                                               ├── [Ollama (로컬 AI)]
                                               │    qwen2.5:3b-instruct-q4_K_S
                                               │    카테고리 분류 + 청크·최종 요약
                                               │
                                               └── [MySQL 8.0]
                                                    users, documents 테이블
                                                    JWT HttpOnly 쿠키 인증
```

---

## 🛠️ 기술 스택

### Backend
`FastAPI` `SQLAlchemy` `Pydantic v2` `MySQL 8.0` `python-jose` `passlib[bcrypt]`
`ollama` `pdfplumber` `EasyOCR` `OpenCV` `python-docx` `python-pptx` `olefile` `PyMuPDF`

### Frontend
`React 18` `TypeScript` `Vite` `TailwindCSS v4` `shadcn/ui` `lucide-react`

### AI
`Ollama` — `qwen2.5:3b-instruct-q4_K_S` (온프레미스, VRAM ~2.5GB)

---

## 🤖 AI 모델 선정 근거

| 모델 | 파라미터 | VRAM | 한국어 품질 | 선정 |
|------|----------|------|-------------|------|
| **Qwen2.5 3B** | 3B | ~2.5GB | ★★★★☆ | ✅ **최종 채택** |
| Phi-4 Mini | 3.8B | ~2.5GB | ★★★★☆ | 후보 |
| Llama3.2 3B | 3B | ~2GB | ★★★☆☆ | 가능 |
| Mistral 7B Q4 | 7B | ~4GB | ★★★★☆ | VRAM 부족 위험 |
| Gemma3 12B | 12B | ~8GB+ | ★★★★★ | ❌ 불가 |

> 테스트 환경: 16GB RAM, GTX 1060 3GB — Temperature 0.1이 0.3보다 키워드 보존율·일관성 우수

---

## 🔐 보안

- **온프레미스 AI**: 문서 데이터 외부 전송 없음
- **JWT 이중 토큰**: access(30분) + refresh(7일), HttpOnly 쿠키, 자동 갱신
- **문서 소유권 접근 제어**: `owner_id` 기반으로 본인 문서만 조회·수정·삭제
- **원본 파일 즉시 삭제**: `tempfile` 사용 후 분석 완료 즉시 `os.unlink()`
- XSS/CSRF 다층 방어

---

## 🐛 트러블슈팅

### 1. EasyOCR 표 내부 텍스트 누락

**문제**: `paragraph=True`가 셀 경계선을 문단 구분선으로 오인해 표 텍스트 블록 파괴  
**시도**: PaddleOCR v3.0 교체 → 한국어 모델 빈값 반환으로 실패  
**해결**: `paragraph=False`로 셀 단위 개별 인식 + `has_images()` 도입으로 이미지 페이지만 OCR 실행 (하이브리드 전략)

```python
# pdf_service.py
if page.images:
    ocr_text = self._ocr_single_page(pdf_path, page_num)
```

### 2. HWP 도형 내 텍스트 누락

**문제**: OLE 바이너리에서 본문(TAG 67)과 도형(TAG 71)이 별도 태그로 분리 저장 → 기존 파서가 도형 스킵  
**해결**: 상태 머신 기반 레코드 순회 — SHAPE_TAG(71) 감지 시 `mode='shape'`로 전환, PARA_HEADER(66) 감지 시 종료

```python
# hwp_service.py
if tag_id == SHAPE_TAG:
    mode = 'shape'
elif tag_id == PARA_TEXT_TAG and mode == 'shape':
    current_shape.append(decode_para_text(record))
elif tag_id == PARA_HEADER_TAG and mode == 'shape':
    mode = 'normal'
```

### 3. 표 이미지 OCR 인식률 저하

**문제**: 작은 글씨·셀 경계 근처 핵심 키워드 누락, Confidence 0.5 기준으로 실제 텍스트까지 제거  
**해결**: 2배 업스케일(Cubic) + CLAHE 대비 향상 + Adaptive Threshold + Confidence 임계값 0.5 → 0.4 완화

```python
# pdf_service.py
OCR_CONFIDENCE_THRESHOLD = 0.4

if w < 1200:
    gray = cv2.resize(gray, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC)
clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
```

---

## 🚀 시작하기

### 사전 요구사항

- Python 3.12+
- Node.js 18+
- MySQL 8.0
- [Ollama](https://ollama.com/) 설치
- Poppler (PDF 처리용)
- LibreOffice (DOC/PPT 변환용)

### 1. Ollama 모델 준비

```bash
ollama pull qwen2.5:3b-instruct-q4_K_S
```

### 2. 백엔드 실행

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# .env 파일 생성
cp .env.example .env            # 아래 환경변수 설정

uvicorn app.main:app --reload
```

### 3. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

### 환경변수 (.env)

```env
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/aiengine
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
POPPLER_PATH=/usr/bin          # Windows: C:\poppler\bin
```

### API 문서

서버 실행 후 `http://localhost:8000/docs` 에서 Swagger UI 확인

---

## 👥 팀 역할 분담

| 역할 | 담당 내용 |
|------|-----------|
| **Backend & AI** | FastAPI 비동기 서버 설계, Ollama AI 엔진 최적화, 멀티포맷 파싱, SSE 취소 메커니즘, 카테고리별 요약 포맷 차별화 |
| **Frontend & UI** | React 18 반응형 대시보드, SSE 실시간 진행률 UI, 드래그&드롭 업로드, 디바운싱 검색, 페이지네이션 |
| **DB & Security** | SQLAlchemy 스키마 설계, JWT 이중 토큰 자동 갱신, XSS/CSRF 다층 방어, 문서 소유권 기반 접근 제어 |
| **QA & Performance** | Qwen2.5 파라미터 튜닝, OCR 전처리 파이프라인 설계, 병렬 처리 최적화, MD5 캐시 기반 중복 처리 방지, NMS 병합 기반 OCR 인식률 향상 |

---

*AI ENGINE — Enterprise Document Intelligence Platform*
