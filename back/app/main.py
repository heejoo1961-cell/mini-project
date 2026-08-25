from fastapi import FastAPI, File, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from starlette.exceptions import HTTPException as StarletteHTTPException
import os

from .extraction import (
    ExtractionFileRequest,
    ExtractionRequestError,
    extract_uploaded_pdfs,
)
from .quote_comparison import compare_quotes
from .ai_provider import AIConfigurationError
from .quote_structuring import structure_extracted_quotes
from .upload import UploadValidationError, save_quote_uploads, validate_upload

app = FastAPI(title="견적 비교 MVP API")

FRONTEND_ORIGIN = os.getenv(
    "FRONTEND_ORIGIN",
    "http://localhost:3000"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        FRONTEND_ORIGIN,
    ],
    allow_credentials=False,
    allow_methods=["*"],
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


class ExtractFilePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    original_name: str = Field(alias="originalName", min_length=1)
    saved_name: str = Field(alias="savedName", min_length=1)


class ExtractQuotesPayload(BaseModel):
    files: list[ExtractFilePayload]


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


@app.post("/api/quotes/upload", response_model=None)
async def upload_quote_files(
    files: list[UploadFile] | None = File(default=None),
):
    try:
        uploaded = await save_quote_uploads(files or [])
    except UploadValidationError as error:
        return error_response(error.status_code, error.code, error.message)

    return {
        "message": "견적서 업로드가 완료되었습니다.",
        "uploadedFiles": [
            {
                "originalName": item.original_name,
                "savedName": item.saved_name,
                "size": item.size,
                "contentType": item.content_type,
            }
            for item in uploaded
        ],
    }


@app.post("/api/quotes/extract", response_model=None)
def extract_pdf_quotes(payload: ExtractQuotesPayload):
    requested_files = [
        ExtractionFileRequest(
            original_name=item.original_name,
            saved_name=item.saved_name,
        )
        for item in payload.files
    ]
    try:
        results = extract_uploaded_pdfs(requested_files)
    except ExtractionRequestError as error:
        return error_response(error.status_code, error.code, error.message)

    return {
        "message": "견적서 텍스트 추출이 완료되었습니다.",
        "results": [
            {
                "originalName": item.original_name,
                "savedName": item.saved_name,
                "status": item.status,
                "pageCount": item.page_count,
                "characterCount": item.character_count,
                "extractedText": item.extracted_text,
                "errorMessage": item.error_message,
            }
            for item in results
        ],
    }


@app.post("/api/quotes/structure", response_model=None)
def structure_pdf_quotes(payload: ExtractQuotesPayload):
    requested_files = [
        ExtractionFileRequest(
            original_name=item.original_name,
            saved_name=item.saved_name,
        )
        for item in payload.files
    ]
    try:
        extracted_results = extract_uploaded_pdfs(requested_files)
    except ExtractionRequestError as error:
        return error_response(error.status_code, error.code, error.message)

    try:
        structured_results, _parser_mode = structure_extracted_quotes(
            extracted_results
        )
    except AIConfigurationError as error:
        return error_response(503, "AI_CONFIGURATION_ERROR", str(error))
    return {
        "message": "견적서 항목 구조화가 완료되었습니다.",
        "results": [item.to_dict() for item in structured_results],
    }


@app.post("/api/quotes/compare", response_model=None)
def compare_pdf_quotes(payload: ExtractQuotesPayload):
    if len(payload.files) < 2:
        return error_response(
            400,
            "AT_LEAST_TWO_FILES_REQUIRED",
            "공급업체 견적 비교에는 PDF가 두 개 이상 필요합니다.",
        )

    requested_files = [
        ExtractionFileRequest(
            original_name=item.original_name,
            saved_name=item.saved_name,
        )
        for item in payload.files
    ]
    try:
        extracted_results = extract_uploaded_pdfs(requested_files)
    except ExtractionRequestError as error:
        return error_response(error.status_code, error.code, error.message)

    try:
        structured_results, _parser_mode = structure_extracted_quotes(
            extracted_results
        )
    except AIConfigurationError as error:
        return error_response(503, "AI_CONFIGURATION_ERROR", str(error))
    comparison = compare_quotes(structured_results)
    return {
        "message": "공급업체 견적 비교가 완료되었습니다.",
        **comparison,
    }
