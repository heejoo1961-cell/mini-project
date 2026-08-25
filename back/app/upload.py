from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

MAX_FILE_SIZE = 10 * 1024 * 1024
READ_CHUNK_SIZE = 1024 * 1024
MAX_QUOTE_FILES = 5
MAX_PDF_FILES = MAX_QUOTE_FILES
PDF_CONTENT_TYPE = "application/pdf"
PDF_SIGNATURE = b"%PDF-"
XLSX_SIGNATURE = b"PK\x03\x04"
UPLOAD_DIRECTORY = Path(__file__).resolve().parents[1] / "uploads"

ALLOWED_MIME_TYPES: dict[str, frozenset[str]] = {
    "xlsx": frozenset(
        {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }
    ),
    "csv": frozenset(
        {
            "text/csv",
            "application/csv",
            "application/vnd.ms-excel",
        }
    ),
}
QUOTE_MIME_TYPES = {
    "pdf": frozenset({PDF_CONTENT_TYPE}),
    **ALLOWED_MIME_TYPES,
}


@dataclass(frozen=True)
class ValidatedFile:
    file_name: str
    file_type: str
    file_size: int


@dataclass(frozen=True)
class StoredQuoteFile:
    original_name: str
    saved_name: str
    size: int
    content_type: str


class UploadValidationError(Exception):
    def __init__(self, *, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


def _safe_file_name(file_name: str | None) -> str:
    if file_name is None or not file_name.strip():
        raise UploadValidationError(
            status_code=400,
            code="INVALID_FILE_NAME",
            message="파일 이름을 확인해 주세요.",
        )

    normalized = file_name.replace("\\", "/")
    safe_name = normalized.rsplit("/", maxsplit=1)[-1].strip()
    if not safe_name:
        raise UploadValidationError(
            status_code=400,
            code="INVALID_FILE_NAME",
            message="파일 이름을 확인해 주세요.",
        )
    return safe_name


def _validate_format(file_name: str, content_type: str | None) -> str:
    file_type = Path(file_name).suffix.removeprefix(".").lower()
    if file_type not in ALLOWED_MIME_TYPES:
        raise UploadValidationError(
            status_code=415,
            code="UNSUPPORTED_EXTENSION",
            message="XLSX 또는 CSV 파일만 업로드할 수 있습니다.",
        )

    if content_type not in ALLOWED_MIME_TYPES[file_type]:
        raise UploadValidationError(
            status_code=415,
            code="UNSUPPORTED_MIME_TYPE",
            message="파일 형식을 확인해 주세요. XLSX 또는 CSV 파일만 업로드할 수 있습니다.",
        )
    return file_type


def _validate_quote_format(file_name: str, content_type: str | None) -> str:
    file_type = Path(file_name).suffix.removeprefix(".").lower()
    if file_type not in QUOTE_MIME_TYPES:
        raise UploadValidationError(
            status_code=415,
            code="UNSUPPORTED_EXTENSION",
            message="PDF, XLSX 또는 CSV 파일만 업로드할 수 있습니다.",
        )
    if content_type not in QUOTE_MIME_TYPES[file_type]:
        raise UploadValidationError(
            status_code=415,
            code="UNSUPPORTED_MIME_TYPE",
            message="파일 형식을 확인해 주세요. PDF, XLSX 또는 CSV 파일만 업로드할 수 있습니다.",
        )
    return file_type


async def validate_upload(file: UploadFile) -> ValidatedFile:
    try:
        file_name = _safe_file_name(file.filename)
        file_type = _validate_format(file_name, file.content_type)

        file_size = 0
        while chunk := await file.read(READ_CHUNK_SIZE):
            file_size += len(chunk)
            if file_size > MAX_FILE_SIZE:
                raise UploadValidationError(
                    status_code=413,
                    code="FILE_TOO_LARGE",
                    message="파일 크기는 10MB 이하여야 합니다.",
                )

        if file_size == 0:
            raise UploadValidationError(
                status_code=400,
                code="EMPTY_FILE",
                message="비어 있는 파일은 업로드할 수 없습니다.",
            )

        return ValidatedFile(
            file_name=file_name,
            file_type=file_type,
            file_size=file_size,
        )
    finally:
        await file.close()


async def save_quote_uploads(files: list[UploadFile]) -> list[StoredQuoteFile]:
    if not files:
        raise UploadValidationError(
            status_code=400,
            code="FILES_REQUIRED",
            message="견적서 파일을 한 개 이상 선택해 주세요.",
        )
    if len(files) > MAX_PDF_FILES:
        raise UploadValidationError(
            status_code=400,
            code="TOO_MANY_FILES",
            message="견적서 파일은 최대 5개까지 업로드할 수 있습니다.",
        )

    UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
    staged: list[tuple[Path, Path, StoredQuoteFile]] = []
    temporary_paths: list[Path] = []
    committed: list[Path] = []

    try:
        for file in files:
            original_name = _safe_file_name(file.filename)
            file_type = _validate_quote_format(original_name, file.content_type)

            saved_name = f"{uuid4()}.{file_type}"
            final_path = UPLOAD_DIRECTORY / saved_name
            temporary_path = UPLOAD_DIRECTORY / f".{saved_name}.part"
            temporary_paths.append(temporary_path)
            file_size = 0
            initial_bytes = b""

            with temporary_path.open("xb") as destination:
                while chunk := await file.read(READ_CHUNK_SIZE):
                    if file_size == 0:
                        initial_bytes = chunk[:8]
                    file_size += len(chunk)
                    if file_size > MAX_FILE_SIZE:
                        raise UploadValidationError(
                            status_code=413,
                            code="FILE_TOO_LARGE",
                            message="파일 크기는 각각 10MB 이하여야 합니다.",
                        )
                    destination.write(chunk)

            if file_size == 0:
                raise UploadValidationError(
                    status_code=400,
                    code="EMPTY_FILE",
                    message="비어 있는 파일은 업로드할 수 없습니다.",
                )
            if file_type == "pdf" and not initial_bytes.startswith(PDF_SIGNATURE):
                raise UploadValidationError(
                    status_code=400,
                    code="INVALID_PDF_SIGNATURE",
                    message="유효한 PDF 파일이 아닙니다.",
                )
            if file_type == "xlsx" and not initial_bytes.startswith(XLSX_SIGNATURE):
                raise UploadValidationError(
                    status_code=400,
                    code="INVALID_XLSX_SIGNATURE",
                    message="유효한 XLSX 파일이 아닙니다.",
                )

            staged.append(
                (
                    temporary_path,
                    final_path,
                    StoredQuoteFile(
                        original_name=original_name,
                        saved_name=saved_name,
                        size=file_size,
                        content_type=file.content_type or "application/octet-stream",
                    ),
                )
            )

        for temporary_path, final_path, _ in staged:
            temporary_path.replace(final_path)
            committed.append(final_path)
        return [stored for _, _, stored in staged]
    except Exception:
        for path in temporary_paths:
            path.unlink(missing_ok=True)
        for path in committed:
            path.unlink(missing_ok=True)
        raise
    finally:
        for file in files:
            await file.close()
