# AI 견적 비교 서비스

기능 구현 전 단계의 최소 프로젝트 골격입니다. Frontend와 Backend는 서로 독립적으로 실행됩니다.

## 로컬 실행

PowerShell에서 Backend를 실행합니다.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r back\requirements.txt
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
