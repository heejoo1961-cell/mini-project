# Frontend

Next.js, React, TypeScript, Tailwind CSS로 만든 다중 PDF 견적서 업로드 화면입니다.

## 실행

```powershell
npm install
Copy-Item .env.local.example .env.local
npm run dev
```

`NEXT_PUBLIC_API_BASE_URL`은 실행 중인 FastAPI 주소여야 합니다. 모든 PDF는 `files`라는 multipart 필드로 전송하며 Content-Type 헤더는 직접 지정하지 않습니다.
