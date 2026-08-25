# AI 견적 비교 서비스

Frontend에서 XLSX 또는 CSV 견적서 한 개를 선택해 FastAPI Backend로 전달하고, 파일 기본정보와 검증 결과를 표시하는 첫 번째 기능입니다. 파일 내용은 파싱하거나 영구 저장하지 않습니다.

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

- 파일 한 개 업로드
- `.xlsx`, `.csv`
- 최대 10 MiB
- 확장자, MIME type, 빈 파일, 실제 크기 검증
- 메모리에서 검증 후 즉시 폐기

PDF, 이미지, 다중 파일, 파일 내용 파싱, AI, 인증, Database 및 Storage는 아직 지원하지 않습니다.

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
