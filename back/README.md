# Backend

FastAPI 기반 파일 업로드 Backend입니다. PDF 확장자, MIME type, 파일 서명과 10 MiB 제한을 검증한 뒤 `uploads/`에 UUID 파일명으로 저장합니다. PDF 내용은 파싱하지 않습니다.

## 실행

```powershell
..\.venv\Scripts\python.exe -m pip install -r requirements.txt
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

## 테스트

```powershell
..\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
..\.venv\Scripts\python.exe -m pytest -q
```

Endpoint:

- `GET /health`
- `POST /api/quote-files/upload`
- `POST /api/quotes/upload` — PDF 견적서 1~5개 저장
