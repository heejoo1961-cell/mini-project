import asyncio
from io import BytesIO

import pytest
from fastapi import UploadFile
from fastapi.testclient import TestClient
from starlette.datastructures import Headers

from app.main import app
from app.upload import MAX_FILE_SIZE, UploadValidationError, validate_upload

client = TestClient(app, raise_server_exceptions=False)
XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def upload(filename: str, content: bytes, content_type: str):
    return client.post(
        "/api/quote-files/upload",
        files={"file": (filename, content, content_type)},
    )


def test_health_endpoint_is_preserved():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_uploads_xlsx_and_returns_actual_file_information():
    content = b"synthetic-xlsx-content"
    response = upload("quote.xlsx", content, XLSX_MIME)
    assert response.status_code == 200
    assert response.json() == {
        "fileName": "quote.xlsx",
        "fileType": "xlsx",
        "fileSize": len(content),
        "status": "success",
        "message": "견적서 파일이 정상적으로 전달되었습니다.",
    }


@pytest.mark.parametrize(
    "content_type",
    ["text/csv", "application/csv", "application/vnd.ms-excel"],
)
def test_accepts_supported_csv_mime_types(content_type: str):
    response = upload("quote.csv", b"item,quantity\npen,10\n", content_type)
    assert response.status_code == 200
    assert response.json()["fileType"] == "csv"


def test_normalizes_uppercase_extension():
    response = upload("QUOTE.XLSX", b"content", XLSX_MIME)
    assert response.status_code == 200
    assert response.json()["fileType"] == "xlsx"


def test_rejects_missing_file():
    response = client.post("/api/quote-files/upload")
    assert response.status_code == 400
    assert response.json()["code"] == "FILE_REQUIRED"


def test_rejects_empty_filename_at_api_boundary():
    response = upload("", b"content", "text/csv")
    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_FILE_NAME"


def test_rejects_empty_filename_in_validator():
    file = UploadFile(
        file=BytesIO(b"content"),
        filename="",
        headers=Headers({"content-type": "text/csv"}),
    )
    with pytest.raises(UploadValidationError) as caught:
        asyncio.run(validate_upload(file))
    assert caught.value.status_code == 400
    assert caught.value.code == "INVALID_FILE_NAME"
    assert file.file.closed


@pytest.mark.parametrize("filename", ["quote.pdf", "quote.xls", "quote.png"])
def test_rejects_unsupported_extensions(filename: str):
    response = upload(filename, b"content", "application/octet-stream")
    assert response.status_code == 415
    assert response.json()["code"] == "UNSUPPORTED_EXTENSION"


@pytest.mark.parametrize(
    "content_type", ["text/plain", "application/octet-stream", ""]
)
def test_rejects_unsupported_mime_types(content_type: str):
    response = upload("quote.csv", b"content", content_type)
    assert response.status_code == 415
    assert response.json()["code"] == "UNSUPPORTED_MIME_TYPE"


def test_rejects_empty_file():
    response = upload("quote.csv", b"", "text/csv")
    assert response.status_code == 400
    assert response.json()["code"] == "EMPTY_FILE"


def test_accepts_file_at_exact_size_limit():
    response = upload("quote.csv", b"a" * MAX_FILE_SIZE, "text/csv")
    assert response.status_code == 200
    assert response.json()["fileSize"] == MAX_FILE_SIZE


def test_rejects_file_one_byte_over_size_limit():
    response = upload("quote.csv", b"a" * (MAX_FILE_SIZE + 1), "text/csv")
    assert response.status_code == 413
    assert response.json()["code"] == "FILE_TOO_LARGE"


def test_removes_path_information_from_filename():
    response = upload("C:\\quotes\\quote.csv", b"content", "text/csv")
    assert response.status_code == 200
    assert response.json()["fileName"] == "quote.csv"


def test_cors_allows_only_configured_frontend_origin():
    allowed = client.options(
        "/api/quote-files/upload",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        },
    )
    denied = client.options(
        "/api/quote-files/upload",
        headers={
            "Origin": "http://127.0.0.1:3000",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "access-control-allow-origin" not in denied.headers
