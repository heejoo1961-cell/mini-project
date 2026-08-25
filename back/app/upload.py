from dataclasses import dataclass
from pathlib import Path

from fastapi import UploadFile

MAX_FILE_SIZE = 10 * 1024 * 1024
READ_CHUNK_SIZE = 1024 * 1024

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


@dataclass(frozen=True)
class ValidatedFile:
    file_name: str
    file_type: str
    file_size: int


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
