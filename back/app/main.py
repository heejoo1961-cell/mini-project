from fastapi import FastAPI

app = FastAPI(title="견적 비교 MVP API")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
