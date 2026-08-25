# AI 견적 비교 서비스

Frontend에서 공급업체별 PDF 견적서를 최대 5개 선택해 FastAPI Backend의 로컬 폴더에 저장하는 기능입니다. 파일 내용 파싱이나 AI 분석은 아직 수행하지 않습니다.

## 로컬 실행

PowerShell에서 Backend를 실행합니다.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r back\requirements-dev.txt
Set-Location back
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

다른 터미널에서 Frontend를 실행합니다.

```powershell
Set-Location front
npm install
Copy-Item .env.local.example .env.local
npm run dev
```

Frontend는 `http://localhost:3000`, Backend 상태 확인은 `http://localhost:8000/health`에서 확인합니다.

## 지원 범위

- PDF 파일 1~5개 업로드
- 파일당 최대 10 MiB
- 확장자, MIME type, `%PDF-` 서명과 실제 크기 검증
- UUID 파일명으로 `back/uploads/`에 로컬 저장

이미지, PDF 내용 파싱, OCR, AI, 인증, Database 및 외부 Storage는 아직 지원하지 않습니다.

## 검증 명령

```powershell
Set-Location back
..\.venv\Scripts\python.exe -m pytest -q

Set-Location ..\front
npm run lint
npm run typecheck
npm run build
```

API 계약은 `docs/upload-api-contract.md`를 참고합니다.
