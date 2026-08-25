from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook
from pypdf import PdfWriter

import app.extraction as extraction
from app.main import app

client = TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def upload_directory(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setattr(extraction, "UPLOAD_DIRECTORY", tmp_path)
    return tmp_path


def write_blank_pdf(path: Path) -> None:
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    with path.open("wb") as output:
        writer.write(output)


def request_extraction(files: list[dict[str, str]]):
    return client.post("/api/quotes/extract", json={"files": files})


def test_blank_pdf_is_marked_as_needing_ocr(upload_directory: Path):
    saved_name = "11111111-1111-4111-8111-111111111111.pdf"
    write_blank_pdf(upload_directory / saved_name)

    response = request_extraction(
        [{"originalName": "blank.pdf", "savedName": saved_name}]
    )

    assert response.status_code == 200
    result = response.json()["results"][0]
    assert result["status"] == "needs_ocr"
    assert result["pageCount"] == 1
    assert result["characterCount"] == 0
    assert result["extractedText"] == ""
    assert result["errorMessage"]


def test_corrupt_pdf_is_a_file_level_failure(upload_directory: Path):
    saved_name = "22222222-2222-4222-8222-222222222222.pdf"
    (upload_directory / saved_name).write_bytes(b"%PDF-corrupt")

    response = request_extraction(
        [{"originalName": "corrupt.pdf", "savedName": saved_name}]
    )

    assert response.status_code == 200
    result = response.json()["results"][0]
    assert result["status"] == "failed"
    assert result["pageCount"] == 0
    assert result["errorMessage"]


def test_one_failed_file_does_not_remove_other_results(upload_directory: Path):
    blank_name = "33333333-3333-4333-8333-333333333333.pdf"
    corrupt_name = "44444444-4444-4444-8444-444444444444.pdf"
    write_blank_pdf(upload_directory / blank_name)
    (upload_directory / corrupt_name).write_bytes(b"%PDF-corrupt")

    response = request_extraction(
        [
            {"originalName": "blank.pdf", "savedName": blank_name},
            {"originalName": "corrupt.pdf", "savedName": corrupt_name},
        ]
    )

    assert response.status_code == 200
    assert [item["status"] for item in response.json()["results"]] == [
        "needs_ocr",
        "failed",
    ]


@pytest.mark.parametrize(
    "saved_name",
    [
        "../11111111-1111-4111-8111-111111111111.pdf",
        "C:\\temp\\11111111-1111-4111-8111-111111111111.pdf",
        "not-a-uuid.pdf",
        "11111111-1111-4111-8111-111111111111.txt",
    ],
)
def test_rejects_path_manipulation_and_invalid_saved_names(
    upload_directory: Path, saved_name: str
):
    response = request_extraction(
        [{"originalName": "quote.pdf", "savedName": saved_name}]
    )

    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_SAVED_NAME"


def test_rejects_missing_uploaded_file(upload_directory: Path):
    response = request_extraction(
        [
            {
                "originalName": "missing.pdf",
                "savedName": "55555555-5555-4555-8555-555555555555.pdf",
            }
        ]
    )

    assert response.status_code == 404
    assert response.json()["code"] == "UPLOADED_FILE_NOT_FOUND"


def test_requires_at_least_one_file(upload_directory: Path):
    response = request_extraction([])
    assert response.status_code == 400
    assert response.json()["code"] == "FILES_REQUIRED"


def test_rejects_more_than_five_files(upload_directory: Path):
    files = [
        {
            "originalName": f"quote-{index}.pdf",
            "savedName": f"00000000-0000-4000-8000-{index:012d}.pdf",
        }
        for index in range(6)
    ]

    response = request_extraction(files)
    assert response.status_code == 400
    assert response.json()["code"] == "TOO_MANY_FILES"


def test_extracts_csv_text(upload_directory: Path):
    saved_name = "66666666-6666-4666-8666-666666666666.csv"
    (upload_directory / saved_name).write_text(
        "품목,수량,단가\n노트,10,1200\n", encoding="utf-8-sig"
    )

    response = request_extraction(
        [{"originalName": "quote.csv", "savedName": saved_name}]
    )

    assert response.status_code == 200
    result = response.json()["results"][0]
    assert result["status"] == "success"
    assert "품목\t수량\t단가" in result["extractedText"]
    assert result["pageCount"] == 1


def test_extracts_xlsx_text(upload_directory: Path):
    saved_name = "77777777-7777-4777-8777-777777777777.xlsx"
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "견적"
    worksheet.append(["품목", "수량", "단가"])
    worksheet.append(["노트", 10, 1200])
    workbook.save(upload_directory / saved_name)

    response = request_extraction(
        [{"originalName": "quote.xlsx", "savedName": saved_name}]
    )

    assert response.status_code == 200
    result = response.json()["results"][0]
    assert result["status"] == "success"
    assert "--- Sheet: 견적 ---" in result["extractedText"]
    assert "노트\t10\t1200" in result["extractedText"]
    assert result["pageCount"] == 1
