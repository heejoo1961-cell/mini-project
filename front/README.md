# Frontend

Next.js, React, TypeScript, Tailwind CSS로 만든 단일 견적서 업로드 화면입니다.

## 실행

```powershell
npm install
Copy-Item .env.local.example .env.local
npm run dev
```

`NEXT_PUBLIC_API_URL`은 실행 중인 FastAPI 주소여야 합니다. 업로드 요청에는 브라우저 `fetch`와 `FormData`를 사용하며 Content-Type 헤더는 직접 지정하지 않습니다.
