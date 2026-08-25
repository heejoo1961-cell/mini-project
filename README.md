아래 내용을 루트 `README.md`에 바로 붙여 넣을 수 있도록 GitHub Markdown 형식으로 정리했습니다.

````markdown
# AI 기반 견적 표준화 및 공급업체 비교 서비스

형식이 서로 다른 공급업체 견적서를 업로드하면 견적 내용을 공통 구조로 정리하고, 공급업체별 가격과 거래조건을 한 화면에서 비교할 수 있는 구매 의사결정 지원 서비스입니다.

이 서비스는 AI가 최종 공급업체를 임의로 추천하거나 선정하지 않습니다. 구매담당자가 견적 조건을 빠르게 검토하고 합리적인 결정을 내릴 수 있도록 비교 근거와 확인이 필요한 항목을 제공합니다.

---

## 서비스 배경

구매 시스템이 없는 중소기업과 소규모 조직에서는 공급업체 견적서를 이메일로 받은 뒤 다음 정보를 Excel 비교표에 수작업으로 옮기는 경우가 많습니다.

- 공급업체명
- 품목명과 규격
- 수량
- 단가
- 운송비
- 부가세
- 총견적금액
- 최소주문수량(MOQ)
- 납기
- 결제조건
- 견적 유효기간

하지만 공급업체마다 견적서의 언어, 표 구성, 열 이름과 금액 표기 방식이 달라 단순한 열 매핑만으로는 정확하게 비교하기 어렵습니다.

이 프로젝트는 PDF·XLSX·CSV 견적서에서 원문을 추출하고, AI 또는 규칙 기반 파서를 통해 동일한 데이터 구조로 변환하여 이러한 반복 작업을 줄이는 것을 목표로 합니다.

---

## 핵심 사용자

- 별도의 ERP·SRM·전자구매 시스템이 없는 중소기업 구매담당자
- PDF와 Excel 견적서를 수작업으로 비교하는 신입·주니어 구매담당자
- 사무용품, 판촉물, 행사 물품 등 간접구매를 담당하는 총무·경영지원 담당자
- 여러 공급업체의 가격과 거래조건을 빠르게 비교해야 하는 실무자

---

## 주요 기능

### 1. 견적서 업로드

- PDF, XLSX, CSV 파일 업로드
- 한 번에 최대 5개 파일 선택
- 드래그 앤 드롭 및 파일 선택 지원
- 선택한 파일의 이름과 크기 표시
- 선택한 파일 개별 삭제
- 파일당 최대 10MB 제한
- 확장자, MIME Type, PDF Signature 검증
- UUID 기반 저장 파일명 생성
- 경로 조작 및 파일명 충돌 방지

### 2. 원문 텍스트 추출

- PDF 페이지별 텍스트 추출
- XLSX 셀 데이터 추출
- CSV 데이터 추출
- 페이지 수와 추출 문자 수 표시
- 파일별 원문 텍스트 접기·펼치기
- 텍스트가 없는 스캔 PDF의 `needs_ocr` 상태 처리
- 손상되거나 암호화된 PDF의 파일별 실패 처리
- 실패한 파일만 다시 추출 가능

### 3. AI 견적 구조화

추출한 원문을 OpenAI Responses API의 Structured Outputs로 분석하여 다음 항목을 공통 구조로 변환합니다.

- 공급업체명
- 견적번호
- 견적일
- 통화
- 품목명
- 규격
- 수량
- 단위
- 단가
- 품목별 금액
- 소계
- 운송비
- 부가세
- 최종 견적금액
- 납기
- MOQ
- 결제조건
- 견적 유효기간
- 품질조건
- 기타조건

AI는 견적서의 고정된 열 위치에만 의존하지 않고 문서의 표와 문맥을 해석합니다.

문서에서 확인되지 않는 값은 임의로 생성하거나 `0`으로 처리하지 않고 `null` 및 확인 필요 항목으로 남깁니다.

### 4. 규칙 기반 구조화

OpenAI API Key가 없는 개발 환경에서는 기존 규칙 기반 파서를 사용할 수 있습니다.

실제로 사용된 파서는 결과의 `parserVersion`에서 확인할 수 있습니다.

```text
openai:gpt-5-mini
rule-based-v1
```

### 5. 누락 및 검증 경고

- 필수 데이터 누락 표시
- 운송비 포함 여부 확인
- 품목별 금액 합계와 소계 비교
- 소계·운송비·부가세 합계와 최종 금액 비교
- MOQ 미충족 여부 표시
- 비교할 수 없는 견적 구분
- 사용자가 추가로 확인해야 할 거래조건 표시

### 6. 공급업체 비교

- 공급업체별 최종 견적금액 비교
- 품목별 단가 비교
- 운송비 및 부가세 구성 비교
- 납기 비교
- MOQ 및 가격 적용 가능 여부 비교
- 거래조건 비교
- 비교 가능, 조건부, 불완전, 비교 불가 상태 구분
- 최저 총견적비용 표시

최저 금액은 참고 정보로만 제공하며, 특정 업체를 “최적 업체”로 추천하지 않습니다.

---

## 사용자 흐름

```text
1. 견적서 업로드
   ↓
2. PDF·XLSX·CSV 원문 추출
   ↓
3. 파일별 원문 텍스트 확인
   ↓
4. AI 또는 규칙 기반 견적 구조화
   ↓
5. 누락 항목 및 경고 확인
   ↓
6. 공급업체별 가격·납기·MOQ·거래조건 비교
```

---

## 화면 구성

| 경로 | 기능 |
|---|---|
| `/upload` | 견적서 선택 및 업로드 |
| `/extract` | 파일별 원문 텍스트 확인 |
| `/structure` | 견적 항목 구조화 결과 확인 |
| `/compare` | 공급업체별 견적 비교 |

Frontend에서 완료된 작업 상태는 현재 브라우저의 `sessionStorage`에 임시로 보관됩니다.

---

## 기술 스택

### Frontend

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Next.js App Router

### Backend

- Python
- FastAPI
- Pydantic
- OpenAI Python SDK
- pypdf
- openpyxl
- python-multipart
- pytest

### AI

- OpenAI Responses API
- Pydantic Structured Outputs
- 기본 모델: `gpt-5-mini`
- Provider 교체를 고려한 별도 AI 계층

---

## 프로젝트 구조

```text
project-root/
├── front/
│   ├── app/
│   │   ├── upload/
│   │   ├── extract/
│   │   ├── structure/
│   │   └── compare/
│   ├── components/
│   ├── context/
│   ├── lib/
│   │   └── api/
│   ├── .env.local.example
│   └── package.json
│
├── back/
│   ├── app/
│   │   ├── main.py
│   │   ├── upload.py
│   │   ├── extraction.py
│   │   ├── ai_provider.py
│   │   ├── quote_structuring.py
│   │   ├── quote_parser.py
│   │   └── quote_comparison.py
│   ├── tests/
│   ├── uploads/
│   ├── .env.example
│   └── requirements.txt
│
├── sample-data/
├── docs/
├── .gitignore
└── README.md
```

---

## Backend API

### 상태 확인

```http
GET /health
```

### 여러 견적서 업로드

```http
POST /api/quotes/upload
Content-Type: multipart/form-data
```

모든 파일은 `files`라는 동일한 필드명으로 전송합니다.

### 원문 텍스트 추출

```http
POST /api/quotes/extract
Content-Type: application/json
```

### 견적 항목 구조화

```http
POST /api/quotes/structure
Content-Type: application/json
```

### 공급업체 견적 비교

```http
POST /api/quotes/compare
Content-Type: application/json
```

공통 요청 예시:

```json
{
  "files": [
    {
      "originalName": "supplier-a.pdf",
      "savedName": "550e8400-e29b-41d4-a716-446655440000.pdf"
    }
  ]
}
```

FastAPI Swagger 문서는 Backend 실행 후 다음 주소에서 확인할 수 있습니다.

```text
http://localhost:8000/docs
```

---

## 환경변수

### Frontend

`front/.env.local`:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

배포 환경에서는 실제 Backend 주소로 변경합니다.

```text
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

### Backend AI 설정

Backend 실행 환경 또는 Coolify Secret에 다음 값을 설정합니다.

```text
QUOTE_PARSER_MODE=auto
AI_PROVIDER=openai
OPENAI_API_KEY=replace-with-your-project-api-key
OPENAI_MODEL=gpt-5-mini
OPENAI_TIMEOUT_SECONDS=60
```

`QUOTE_PARSER_MODE`는 다음 값을 지원합니다.

| 값 | 동작 |
|---|---|
| `auto` | API Key가 있으면 AI, 없으면 규칙 기반 파서 사용 |
| `ai` | AI 사용을 강제하고 설정 오류를 명확하게 반환 |
| `rules` | 외부 AI를 호출하지 않고 규칙 기반 파서 사용 |

> `OPENAI_API_KEY`는 Frontend 환경변수나 `NEXT_PUBLIC_` 변수에 넣으면 안 됩니다. 반드시 Backend 실행 환경의 Secret으로 관리해야 합니다.

OpenAI 요청에는 `store=False`를 적용하여 Responses API 결과가 애플리케이션 상태로 저장되지 않도록 설정했습니다.

---

## 로컬 실행

### 1. Backend 가상환경 생성

프로젝트 루트에서 실행합니다.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r .\back\requirements.txt
```

### 2. Backend 실행

```powershell
cd back
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend 확인:

```text
http://localhost:8000/health
http://localhost:8000/docs
```

### 3. Frontend 환경변수 설정

```powershell
cd front
Copy-Item .env.local.example .env.local
```

### 4. Frontend 설치 및 실행

```powershell
npm install
npm run dev
```

Frontend 확인:

```text
http://localhost:3000/upload
```

---

## 로컬에서 AI 활성화

PowerShell에서 Backend를 실행하기 전에 환경변수를 설정합니다.

```powershell
$env:QUOTE_PARSER_MODE="ai"
$env:AI_PROVIDER="openai"
$env:OPENAI_API_KEY="발급받은 API Key"
$env:OPENAI_MODEL="gpt-5-mini"
$env:OPENAI_TIMEOUT_SECONDS="60"

cd back
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API Key를 코드, README 또는 Git 저장소에 직접 기록하지 마세요.

---

## 테스트

### Backend 전체 테스트

```powershell
cd back
..\.venv\Scripts\python.exe -m pytest -q
```

AI 테스트에서는 실제 외부 API가 호출되지 않도록 Fake Provider를 사용합니다.

현재 검증 결과:

```text
76 passed
```

### Frontend 검사

```powershell
cd front
npm run lint
npm run typecheck
npm run build
```

---

## 데이터 처리 원칙

- 업로드 파일 내용은 로그에 출력하지 않습니다.
- 저장 파일명은 UUID로 생성합니다.
- 원본 파일명은 사용자 표시 목적으로만 유지합니다.
- AI가 확인할 수 없는 값은 임의 생성하지 않습니다.
- AI 결과는 최종 결정이 아닌 사용자 검토 대상입니다.
- 최저 가격과 최적 공급업체를 동일한 의미로 취급하지 않습니다.
- 금액 및 거래조건 검증은 Backend에서 수행합니다.

---

## 현재 저장 방식

업로드한 파일은 현재 다음 로컬 폴더에 저장됩니다.

```text
back/uploads/
```

실제 업로드 파일은 Git에 포함되지 않습니다.

현재 방식은 로컬 개발 및 단일 서버 MVP에 적합합니다. 운영 환경에서는 Coolify Persistent Volume을 연결하거나 향후 다음 저장소로 이전할 수 있습니다.

- Amazon S3
- Supabase Storage
- Vercel Blob
- 기타 S3 호환 Object Storage

---

## 현재 구현하지 않은 기능

- OCR
- 스캔 PDF 문자 인식
- 로그인 및 회원가입
- 사용자별 데이터 접근 제한
- Database 영구 저장
- Supabase 연동
- 업로드 이력 조회
- 외화 및 환율 변환
- 공급업체 자동 추천
- 품질평가 점수
- 평가 가중치
- 협상 항목 자동 생성
- 비교 결과 다운로드
- 보고서 생성
- 이메일 발송
- 운영 배포 자동화

---

## 운영 전 주의사항

현재 버전에는 사용자 인증이 없습니다. 인터넷에 공개 배포할 경우 누구나 파일 업로드 API를 호출할 수 있으므로 다음 보호 기능이 필요합니다.

- 사용자 인증 또는 접근 비밀번호
- 업로드 API Rate Limit
- 파일 보관 기간 및 자동 삭제 정책
- 서버 디스크 사용량 모니터링
- 정기 백업
- HTTPS
- 운영 도메인 기반 CORS 설정
- API Key 및 Secret 관리
- 악성 파일 업로드 방어

---

## 향후 개발 방향

1. 사용자 검토 및 구조화 결과 직접 수정
2. OCR을 이용한 스캔 PDF 처리
3. Supabase Auth 및 사용자 인증
4. PostgreSQL 기반 구매 건 저장
5. Object Storage 기반 원본 파일 관리
6. 품목명과 단위 표준화 고도화
7. 거래조건별 평가 기준 및 가중치
8. 최종 선정 업체와 선정 사유 기록
9. 비교 결과 CSV 및 보고서 다운로드
10. AI Provider 추가 및 모델 교체 지원

---

## 서비스 원칙

이 프로젝트는 AI가 구매담당자를 대신해 공급업체를 결정하는 서비스가 아닙니다.

AI는 견적 내용을 구조화하고 누락된 조건과 비교 근거를 제공하며, 최종 판단과 공급업체 선정은 구매담당자가 수행합니다.
````
