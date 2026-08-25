# Backend

FastAPI 기반 파일 업로드 Backend입니다. 파일을 파싱하거나 저장하지 않고 확장자, MIME type, 빈 파일 여부와 10 MiB 제한만 검증합니다.

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
