from io import BytesIO
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook

import app.upload as upload_module
from app.main import app

client = TestClient(app, raise_server_exceptions=False)
XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@pytest.fixture
def upload_directory(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setattr(upload_module, "UPLOAD_DIRECTORY", tmp_path)
    return tmp_path


def xlsx_bytes() -> bytes:
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.append(["품목", "수량", "단가"])
    worksheet.append(["노트", 10, 1200])
    output = BytesIO()
    workbook.save(output)
    return output.getvalue()


@pytest.mark.parametrize(
    ("filename", "content", "content_type", "extension"),
    [
        ("quote.pdf", b"%PDF-1.4 synthetic", "application/pdf", ".pdf"),
        ("quote.csv", b"item,quantity\npen,10\n", "text/csv", ".csv"),
        ("quote.xlsx", xlsx_bytes(), XLSX_MIME, ".xlsx"),
    ],
)
def test_uploads_supported_quote_files(
    upload_directory: Path,
    filename: str,
    content: bytes,
    content_type: str,
    extension: str,
):
    response = client.post(
        "/api/quotes/upload",
        files=[("files", (filename, content, content_type))],
    )

    assert response.status_code == 200
    uploaded = response.json()["uploadedFiles"][0]
    assert uploaded["originalName"] == filename
    assert uploaded["savedName"].endswith(extension)
    assert uploaded["contentType"] == content_type
    assert (upload_directory / uploaded["savedName"]).read_bytes() == content


def test_rejects_unsupported_quote_file(upload_directory: Path):
    response = client.post(
        "/api/quotes/upload",
        files=[("files", ("quote.png", b"image", "image/png"))],
    )

    assert response.status_code == 415
    assert response.json()["code"] == "UNSUPPORTED_EXTENSION"
    assert list(upload_directory.iterdir()) == []
