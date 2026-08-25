from types import SimpleNamespace

import pytest

from app.ai_provider import (
    AIConfigurationError,
    AIProviderError,
    AIQuoteDocument,
    AIQuoteItem,
    OpenAIQuoteProvider,
    get_quote_ai_provider,
)
from app.extraction import ExtractionResult
from app.quote_structuring import structure_extracted_quotes


def extracted(text: str = "형식이 일정하지 않은 견적서 원문") -> ExtractionResult:
    return ExtractionResult(
        original_name="quote.pdf",
        saved_name="11111111-1111-4111-8111-111111111111.pdf",
        status="success",
        page_count=1,
        character_count=len(text),
        extracted_text=text,
        error_message=None,
    )


def ai_document() -> AIQuoteDocument:
    return AIQuoteDocument(
        supplier_name="테스트 공급사",
        quote_number="Q-2026-001",
        quote_date="2026-08-25",
        currency="krw",
        items=[
            AIQuoteItem(
                item_name="행사용 가방",
                specification="면 10수, 단면 인쇄",
                quantity=500,
                unit="EA",
                unit_price=4500,
                amount=2250000,
            )
        ],
        subtotal=2250000,
        shipping_cost=100000,
        shipping_included=False,
        vat=235000,
        grand_total=2585000,
        lead_time="시안 확정 후 10일",
        moq="100개",
        payment_terms="계약금 30%, 납품 후 70%",
        validity="견적일로부터 14일",
        quality_terms="불량품 무상 재제작",
        remarks=None,
    )


class FakeProvider:
    parser_version = "fake-ai:test"

    def structure_quote(self, extracted_text: str) -> AIQuoteDocument:
        assert "견적서" in extracted_text
        return ai_document()


class FailingProvider:
    parser_version = "fake-ai:test"

    def structure_quote(self, extracted_text: str) -> AIQuoteDocument:
        raise AIProviderError("provider failure")


def test_ai_provider_maps_unstructured_text_to_existing_response_contract():
    results, parser_mode = structure_extracted_quotes(
        [extracted()],
        provider=FakeProvider(),
        resolve_provider=False,
    )

    result = results[0]
    assert parser_mode == "ai"
    assert result.status == "success"
    assert result.parser_version == "fake-ai:test"
    assert result.supplier_name == "테스트 공급사"
    assert result.currency == "KRW"
    assert result.items[0].item_name == "행사용 가방"
    assert result.grand_total == 2585000
    assert result.missing_fields == []
    assert result.warnings == []


def test_ai_failure_is_isolated_as_a_file_result():
    results, parser_mode = structure_extracted_quotes(
        [extracted()],
        provider=FailingProvider(),
        resolve_provider=False,
    )

    assert parser_mode == "ai"
    assert results[0].status == "failed"
    assert results[0].parser_version == "fake-ai:test"
    assert results[0].warnings == [
        "AI 견적 구조화에 실패했습니다. 잠시 후 다시 시도해 주세요."
    ]


def test_auto_mode_uses_rules_when_api_key_is_not_configured(monkeypatch):
    monkeypatch.setenv("QUOTE_PARSER_MODE", "auto")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    assert get_quote_ai_provider() is None


def test_ai_mode_requires_api_key(monkeypatch):
    monkeypatch.setenv("QUOTE_PARSER_MODE", "ai")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    with pytest.raises(AIConfigurationError, match="OPENAI_API_KEY"):
        get_quote_ai_provider()


def test_openai_provider_uses_structured_outputs_without_storing_response():
    captured: dict[str, object] = {}

    class FakeResponses:
        def parse(self, **kwargs):
            captured.update(kwargs)
            return SimpleNamespace(output_parsed=ai_document())

    client = SimpleNamespace(responses=FakeResponses())
    provider = OpenAIQuoteProvider(
        api_key="test-key",
        model="test-model",
        client=client,
    )

    result = provider.structure_quote("견적서 원문")

    assert result.supplier_name == "테스트 공급사"
    assert captured["model"] == "test-model"
    assert captured["store"] is False
    assert captured["text_format"] is AIQuoteDocument
    assert "견적서 원문" in captured["input"][1]["content"]
