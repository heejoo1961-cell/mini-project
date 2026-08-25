from dataclasses import replace
from pathlib import Path

import pytest

from app.extraction import ExtractionResult
from app.quote_comparison import (
    compare_quotes,
    normalize_item_name,
    parse_lead_time_days,
    parse_moq_by_item,
)
from app.quote_parser import QuoteItem, StructuredQuote, parse_quote

FIXTURES = Path(__file__).parent / "fixtures"


def structured(fixture_name: str, saved_name: str) -> StructuredQuote:
    text = (FIXTURES / fixture_name).read_text(encoding="utf-8")
    return parse_quote(
        ExtractionResult(
            original_name=fixture_name.replace(".txt", ".pdf"),
            saved_name=saved_name,
            status="success",
            page_count=1,
            character_count=len(text),
            extracted_text=text,
            error_message=None,
        )
    )


@pytest.fixture
def three_quotes() -> list[StructuredQuote]:
    return [
        structured("quote_standard.txt", "11111111-1111-4111-8111-111111111111.pdf"),
        structured(
            "quote_included_shipping.txt",
            "22222222-2222-4222-8222-222222222222.pdf",
        ),
        structured("quote_item_moq.txt", "33333333-3333-4333-8333-333333333333.pdf"),
    ]


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("Canvas Bag", "Canvas Bag"),
        ("Recycled cotton bag", "Canvas Bag"),
        ("Eco Bag", "Canvas Bag"),
        ("에코백", "Canvas Bag"),
        ("Stainless Tumbler", "Tumbler"),
        ("Stainless tumbler 500 ml", "Tumbler"),
        ("스테인리스 텀블러", "Tumbler"),
    ],
)
def test_matches_supported_item_aliases(name: str, expected: str):
    result = normalize_item_name(name)
    assert result.name == expected
    assert result.matched_alias is True


def test_keeps_unmatched_item_independent():
    result = normalize_item_name("Custom Lanyard")
    assert result.name == "Custom Lanyard"
    assert result.matched_alias is False


def test_parses_common_and_item_specific_moq():
    assert parse_moq_by_item("100 units per item") == (100, {})
    assert parse_moq_by_item("300 bags / 200 tumblers") == (
        None,
        {"Canvas Bag": 300, "Tumbler": 200},
    )
    assert parse_moq_by_item("Canvas Bag: 1,000 EA; Tumbler: 500 EA") == (
        None,
        {"Canvas Bag": 1000, "Tumbler": 500},
    )


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("10 days after order", 10),
        ("최종 시안 확정 후 7일", 7),
        ("협의 후 결정", None),
    ],
)
def test_standardizes_explicit_lead_time_days(value: str, expected: int | None):
    assert parse_lead_time_days(value) == expected


def test_compares_two_eligible_quotes_and_calculates_differences(three_quotes):
    comparison = compare_quotes(three_quotes[:2])

    assert comparison["currency"] == "KRW"
    assert comparison["benchmarkGrandTotal"] == 5544000
    suppliers = comparison["suppliers"]
    assert [supplier["status"] for supplier in suppliers] == [
        "comparable",
        "comparable",
    ]
    assert suppliers[0]["differenceFromBenchmark"] == 0
    assert suppliers[0]["differenceRate"] == 0
    assert suppliers[1]["differenceFromBenchmark"] == 165000
    assert suppliers[1]["differenceRate"] == 2.98
    assert [supplier["leadTimeDays"] for supplier in suppliers] == [10, 7]


def test_three_quotes_exclude_moq_failure_from_benchmarks(three_quotes):
    comparison = compare_quotes(three_quotes)
    suppliers = comparison["suppliers"]

    assert [supplier["status"] for supplier in suppliers] == [
        "comparable",
        "comparable",
        "conditional",
    ]
    assert comparison["benchmarkGrandTotal"] == 5544000
    conditional = suppliers[2]
    assert conditional["grandTotal"] == 5390000
    assert conditional["priceApplicability"] == "conditional"
    assert conditional["differenceFromBenchmark"] is None
    assert conditional["differenceRate"] is None
    assert any("MOQ보다 적어" in warning for warning in conditional["warnings"])

    groups = {group["normalizedItemName"]: group for group in comparison["itemGroups"]}
    assert set(groups) == {"Canvas Bag", "Tumbler"}
    assert groups["Canvas Bag"]["benchmarkUnitPrice"] == 4500
    assert groups["Tumbler"]["benchmarkUnitPrice"] == 8900

    bag_offers = groups["Canvas Bag"]["offers"]
    assert [offer["originalItemName"] for offer in bag_offers] == [
        "Canvas Bag",
        "Recycled cotton bag",
        "Canvas Bag",
    ]
    assert [offer["moqQuantity"] for offer in bag_offers] == [100, 300, 1000]
    assert [offer["moqMet"] for offer in bag_offers] == [True, True, False]
    assert [offer["differenceFromBenchmark"] for offer in bag_offers] == [
        0,
        300,
        None,
    ]
    assert [offer["differenceRate"] for offer in bag_offers] == [0, 6.67, None]

    tumbler_offers = groups["Tumbler"]["offers"]
    assert [offer["moqQuantity"] for offer in tumbler_offers] == [100, 200, 500]
    assert [offer["moqMet"] for offer in tumbler_offers] == [True, True, False]
    assert [offer["differenceFromBenchmark"] for offer in tumbler_offers] == [
        0,
        400,
        None,
    ]
    assert [offer["differenceRate"] for offer in tumbler_offers] == [0, 4.49, None]


def test_quantity_difference_makes_quotes_not_comparable(three_quotes):
    changed_item = replace(three_quotes[1].items[0], quantity=400)
    changed_quote = replace(
        three_quotes[1], items=[changed_item, *three_quotes[1].items[1:]]
    )

    comparison = compare_quotes([three_quotes[0], changed_quote])

    assert [item["status"] for item in comparison["suppliers"]] == [
        "not_comparable",
        "not_comparable",
    ]
    assert comparison["benchmarkGrandTotal"] is None


def test_currency_difference_excludes_price_comparison(three_quotes):
    changed_quote = replace(three_quotes[1], currency="USD")
    comparison = compare_quotes([three_quotes[0], changed_quote])

    assert comparison["currency"] is None
    assert comparison["benchmarkGrandTotal"] is None
    assert all(
        item["status"] == "not_comparable" for item in comparison["suppliers"]
    )


def test_missing_amount_remains_null_and_marks_supplier_incomplete(three_quotes):
    changed_item = replace(three_quotes[1].items[0], unit_price=None, amount=None)
    changed_quote = replace(
        three_quotes[1], items=[changed_item, *three_quotes[1].items[1:]]
    )
    comparison = compare_quotes([three_quotes[0], changed_quote])

    supplier = comparison["suppliers"][1]
    offer = comparison["itemGroups"][0]["offers"][1]
    assert supplier["status"] == "incomplete"
    assert offer["unitPrice"] is None
    assert offer["amount"] is None
    assert offer["differenceFromBenchmark"] is None


def test_missing_item_is_not_created_as_zero_offer(three_quotes):
    changed_quote = replace(three_quotes[1], items=three_quotes[1].items[:1])
    comparison = compare_quotes([three_quotes[0], changed_quote])
    tumbler_group = next(
        group
        for group in comparison["itemGroups"]
        if group["normalizedItemName"] == "Tumbler"
    )

    assert len(tumbler_group["offers"]) == 1
    assert tumbler_group["offers"][0]["supplierName"] == "Blueworks Design"


def test_failed_file_does_not_remove_valid_supplier(three_quotes):
    failed = StructuredQuote(
        original_name="broken.pdf",
        saved_name="99999999-9999-4999-8999-999999999999.pdf",
        status="failed",
        supplier_name=None,
        quote_number=None,
        quote_date=None,
        currency=None,
        items=[],
        subtotal=None,
        shipping_cost=None,
        shipping_included=None,
        vat=None,
        grand_total=None,
        lead_time=None,
        moq=None,
        payment_terms=None,
        validity=None,
        quality_terms=None,
        remarks=None,
        missing_fields=["supplierName", "items", "grandTotal"],
        warnings=["PDF 텍스트 추출에 실패했습니다."],
    )
    comparison = compare_quotes([three_quotes[0], failed])

    assert comparison["suppliers"][0]["status"] == "comparable"
    assert comparison["suppliers"][1]["status"] == "incomplete"
    assert comparison["benchmarkGrandTotal"] == 5544000


def test_comparison_module_has_no_supplier_or_file_specific_rules():
    source = (
        Path(__file__).parents[1] / "app" / "quote_comparison.py"
    ).read_text(encoding="utf-8")
    assert "Blueworks Design" not in source
    assert "Green Partners" not in source
    assert "Value Factory" not in source
    assert "sample_quote" not in source
