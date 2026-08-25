from fastapi import FastAPI, File, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .upload import UploadValidationError, validate_upload

app = FastAPI(title="견적 비교 MVP API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["POST"],
    allow_headers=["*"],
)


def error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"status": "error", "code": code, "message": message},
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    request: Request, error: RequestValidationError
) -> JSONResponse:
    if any(item.get("loc") == ("body", "file") for item in error.errors()):
        return error_response(
            400,
            "INVALID_FILE_NAME",
            "파일 이름을 확인해 주세요.",
        )
    return error_response(
        400,
        "INVALID_UPLOAD_REQUEST",
        "업로드 요청 형식을 확인해 주세요.",
    )


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(
    request: Request, error: StarletteHTTPException
) -> JSONResponse:
    if error.status_code == 400:
        return error_response(
            400,
            "INVALID_UPLOAD_REQUEST",
            "업로드 요청 형식을 확인해 주세요.",
        )
    return error_response(error.status_code, "HTTP_ERROR", "요청을 처리할 수 없습니다.")


@app.exception_handler(Exception)
async def internal_error_handler(request: Request, error: Exception) -> JSONResponse:
    return error_response(
        500,
        "INTERNAL_SERVER_ERROR",
        "파일 업로드 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/quote-files/upload", response_model=None)
async def upload_quote_file(
    file: UploadFile | None = File(default=None),
):
    if file is None:
        return error_response(400, "FILE_REQUIRED", "견적서 파일을 선택해 주세요.")

    try:
        validated = await validate_upload(file)
    except UploadValidationError as error:
        return error_response(error.status_code, error.code, error.message)

    return {
        "fileName": validated.file_name,
        "fileType": validated.file_type,
        "fileSize": validated.file_size,
        "status": "success",
        "message": "견적서 파일이 정상적으로 전달되었습니다.",
    }
