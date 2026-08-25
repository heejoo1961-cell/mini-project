# Backend

FastAPI 기반 파일 업로드 Backend입니다. PDF 확장자, MIME type, 파일 서명과 10 MiB 제한을 검증한 뒤 `uploads/`에 UUID 파일명으로 저장합니다. PDF 내용은 파싱하지 않습니다.

## AI 견적 구조화

텍스트 추출이 끝난 견적서는 OpenAI Responses API의 Structured Outputs로
공급업체, 품목, 금액, 납기 및 거래조건을 공통 구조로 변환할 수 있습니다.
실제 키는 파일에 저장하지 말고 실행 환경 또는 Coolify Secret으로 주입합니다.

```text
QUOTE_PARSER_MODE=auto
AI_PROVIDER=openai
OPENAI_API_KEY=replace-with-your-project-api-key
OPENAI_MODEL=gpt-5-mini
OPENAI_TIMEOUT_SECONDS=60
```

`auto`는 API 키가 있으면 AI를 사용하고, 없으면 기존 규칙 기반 파서를
사용합니다. 운영 환경에서 AI 사용을 강제하려면 `QUOTE_PARSER_MODE=ai`로
설정합니다. 실제로 사용된 방식은 구조화 결과의 `parserVersion`에서
`openai:<model>` 또는 `rule-based-v1`로 확인할 수 있습니다.

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
