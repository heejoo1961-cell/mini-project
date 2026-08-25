from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.extraction import ExtractionResult
from app.main import app
from app.quote_parser import parse_money, parse_quote

FIXTURE_DIRECTORY = Path(__file__).parent / "fixtures"
client = TestClient(app, raise_server_exceptions=False)


def extracted(
    fixture_name: str,
    *,
    original_name: str = "quote.pdf",
    saved_name: str = "11111111-1111-4111-8111-111111111111.pdf",
) -> ExtractionResult:
    return ExtractionResult(
        original_name=original_name,
        saved_name=saved_name,
        status="success",
        page_count=1,
        character_count=1,
        extracted_text=(FIXTURE_DIRECTORY / fixture_name).read_text(encoding="utf-8"),
        error_message=None,
    )


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("KRW 4,500", 4500),
        ("₩4,500", 4500),
        ("4,500원", 4500),
        ("4,500", 4500),
        ("", None),
        ("Included", None),
    ],
)
def test_normalizes_supported_money_notation(value: str, expected: int | None):
    assert parse_money(value) == expected


def test_parses_standard_six_column_quote():
    result = parse_quote(extracted("quote_standard.txt"))

    assert result.status == "success"
    assert result.supplier_name == "Blueworks Design"
    assert result.quote_number == "BW-260819-01"
    assert result.quote_date == "2026-08-19"
    assert result.currency == "KRW"
    assert [item.to_dict() for item in result.items] == [
        {
            "itemName": "Canvas Bag",
            "specification": "10s cotton / 1-side print",
            "quantity": 500,
            "unit": "EA",
            "unitPrice": 4500,
            "amount": 2250000,
        },
        {
            "itemName": "Stainless Tumbler",
            "specification": "500 ml / 1-color print",
            "quantity": 300,
            "unit": "EA",
            "unitPrice": 8900,
            "amount": 2670000,
        },
    ]
    assert (result.subtotal, result.shipping_cost, result.vat, result.grand_total) == (
        4920000,
        120000,
        504000,
        5544000,
    )
    assert result.shipping_included is False
    assert result.lead_time == "10 days after order and artwork approval"
    assert result.moq == "100 units per item"
    assert result.payment_terms == "30% deposit, 70% after delivery"
    assert result.validity == "14 days from quote date"
    assert result.missing_fields == []
    assert result.warnings == []


def test_parses_numbered_rows_and_included_shipping():
    result = parse_quote(extracted("quote_included_shipping.txt"))

    assert result.status == "success"
    assert result.supplier_name == "Green Partners"
    assert len(result.items) == 2
    assert result.items[0].quantity == 500
    assert result.items[0].unit == "EA"
    assert result.shipping_cost == 0
    assert result.shipping_included is True
    assert result.subtotal == 5190000
    assert result.vat == 519000
    assert result.grand_total == 5709000
    assert result.quality_terms == (
        "Defective printed units will be reproduced at no charge"
    )
    assert result.warnings == []


def test_parses_item_level_moq_without_guessing_missing_units():
    result = parse_quote(extracted("quote_item_moq.txt"))

    assert result.status == "partial"
    assert result.supplier_name == "Value Factory Co., Ltd."
    assert result.items[0].unit is None
    assert result.moq == "Canvas Bag: 1,000 EA; Tumbler: 500 EA"
    assert result.shipping_cost == 250000
    assert result.shipping_included is False
    assert result.grand_total == 5390000
    assert result.quality_terms == "One pre-production sample included"
    assert result.warnings == [
        "중요 조건 확인: Listed prices apply only when the MOQ is met. "
        "Prices must be renegotiated for the requested quantities."
    ]


def test_marks_separate_shipping_without_amount_as_partial():
    source = extracted("quote_standard.txt")
    source = ExtractionResult(
        **{
            **source.__dict__,
            "extracted_text": source.extracted_text.replace(
                "Shipping\nKRW 120,000", "Shipping\nExcluded"
            ),
        }
    )

    result = parse_quote(source)

    assert result.status == "partial"
    assert result.shipping_cost is None
    assert result.shipping_included is False
    assert "shippingCost" in result.missing_fields
    assert "운송비가 별도이지만 금액을 확인할 수 없습니다." in result.warnings


def test_preserves_values_and_warns_about_amount_mismatches():
    source = extracted("quote_standard.txt")
    source = ExtractionResult(
        **{
            **source.__dict__,
            "extracted_text": source.extracted_text.replace(
                "KRW 4,920,000\nShipping", "KRW 4,900,000\nShipping"
            ),
        }
    )

    result = parse_quote(source)

    assert result.subtotal == 4900000
    assert result.grand_total == 5544000
    assert result.status == "partial"
    assert "품목별 금액 합계와 소계가 일치하지 않습니다." in result.warnings
    assert "소계·운송비·부가세 합계와 최종 금액이 일치하지 않습니다." in result.warnings


def test_missing_values_remain_null_and_are_reported():
    source = extracted("quote_standard.txt")
    source = ExtractionResult(
        **{
            **source.__dict__,
            "extracted_text": source.extracted_text.replace(
                "Quote No.: BW-260819-01\n", ""
            ),
        }
    )

    result = parse_quote(source)
    assert result.quote_number is None
    assert "quoteNumber" in result.missing_fields
    assert result.status == "partial"


def test_failed_extraction_becomes_failed_structure_result():
    result = parse_quote(
        ExtractionResult(
            original_name="scan.pdf",
            saved_name="22222222-2222-4222-8222-222222222222.pdf",
            status="needs_ocr",
            page_count=1,
            character_count=0,
            extracted_text="",
            error_message="스캔 문서로 추정되어 텍스트를 읽을 수 없습니다.",
        )
    )

    assert result.status == "failed"
    assert result.supplier_name is None
    assert result.grand_total is None
    assert result.items == []
    assert result.warnings


def test_structure_api_keeps_success_when_another_file_failed(monkeypatch):
    success = extracted("quote_standard.txt")
    failure = ExtractionResult(
        original_name="broken.pdf",
        saved_name="22222222-2222-4222-8222-222222222222.pdf",
        status="failed",
        page_count=0,
        character_count=0,
        extracted_text="",
        error_message="PDF 텍스트 추출에 실패했습니다.",
    )
    monkeypatch.setattr(main_module, "extract_uploaded_pdfs", lambda files: [success, failure])

    response = client.post(
        "/api/quotes/structure",
        json={
            "files": [
                {
                    "originalName": "quote.pdf",
                    "savedName": "11111111-1111-4111-8111-111111111111.pdf",
                },
                {
                    "originalName": "broken.pdf",
                    "savedName": "22222222-2222-4222-8222-222222222222.pdf",
                },
            ]
        },
    )

    assert response.status_code == 200
    assert [item["status"] for item in response.json()["results"]] == [
        "success",
        "failed",
    ]


def test_parser_does_not_contain_fixture_supplier_names():
    parser_source = (Path(__file__).parents[1] / "app" / "quote_parser.py").read_text(
        encoding="utf-8"
    )
    assert "Blueworks Design" not in parser_source
    assert "Green Partners" not in parser_source
    assert "Value Factory" not in parser_source
