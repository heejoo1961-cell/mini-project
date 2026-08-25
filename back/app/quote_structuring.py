from .ai_provider import (
    AIProviderError,
    AIQuoteDocument,
    QuoteAIProvider,
    get_quote_ai_provider,
)
from .extraction import ExtractionResult
from .quote_parser import QuoteItem, StructuredQuote, parse_quote


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _missing_fields(
    document: AIQuoteDocument, items: list[QuoteItem]
) -> list[str]:
    missing: list[str] = []
    if _clean_text(document.supplier_name) is None:
        missing.append("supplierName")
    if not items:
        missing.append("items")
    elif any(item.quantity is None for item in items):
        missing.append("quantity")
    if document.grand_total is None:
        missing.append("grandTotal")
    for field_name, value in (
        ("quoteNumber", document.quote_number),
        ("quoteDate", document.quote_date),
        ("currency", document.currency),
        ("subtotal", document.subtotal),
        ("leadTime", document.lead_time),
        ("moq", document.moq),
        ("paymentTerms", document.payment_terms),
        ("validity", document.validity),
    ):
        is_missing = _clean_text(value) is None if isinstance(value, str) else value is None
        if is_missing:
            missing.append(field_name)
    if document.shipping_cost is None:
        missing.append("shippingCost")
    return missing


def _validation_warnings(
    document: AIQuoteDocument, items: list[QuoteItem]
) -> list[str]:
    warnings: list[str] = []
    if document.shipping_cost is None and document.shipping_included is None:
        warnings.append("배송비 포함 여부를 확인할 수 없습니다.")
    elif document.shipping_cost is None and document.shipping_included is False:
        warnings.append("배송비가 별도이지만 금액을 확인할 수 없습니다.")

    item_amounts = [item.amount for item in items]
    if (
        items
        and document.subtotal is not None
        and all(amount is not None for amount in item_amounts)
        and sum(amount for amount in item_amounts if amount is not None)
        != document.subtotal
    ):
        warnings.append("품목별 금액 합계와 소계가 일치하지 않습니다.")

    if (
        document.subtotal is not None
        and document.shipping_cost is not None
        and document.vat is not None
        and document.grand_total is not None
        and document.subtotal + document.shipping_cost + document.vat
        != document.grand_total
    ):
        warnings.append("소계·배송비·부가세 합계와 최종 금액이 일치하지 않습니다.")
    return warnings


def _from_ai_document(
    extracted: ExtractionResult,
    document: AIQuoteDocument,
    parser_version: str,
) -> StructuredQuote:
    items = [
        QuoteItem(
            item_name=_clean_text(item.item_name),
            specification=_clean_text(item.specification),
            quantity=item.quantity,
            unit=_clean_text(item.unit),
            unit_price=item.unit_price,
            amount=item.amount,
        )
        for item in document.items
        if _clean_text(item.item_name) is not None or item.amount is not None
    ]
    missing_fields = _missing_fields(document, items)
    warnings = _validation_warnings(document, items)
    major_values_found = sum(
        [
            _clean_text(document.supplier_name) is not None,
            bool(items),
            document.grand_total is not None,
        ]
    )
    if major_values_found <= 1:
        status = "failed"
    elif missing_fields or warnings:
        status = "partial"
    else:
        status = "success"

    return StructuredQuote(
        original_name=extracted.original_name,
        saved_name=extracted.saved_name,
        status=status,
        supplier_name=_clean_text(document.supplier_name),
        quote_number=_clean_text(document.quote_number),
        quote_date=_clean_text(document.quote_date),
        currency=(
            _clean_text(document.currency).upper()
            if _clean_text(document.currency)
            else None
        ),
        items=items,
        subtotal=document.subtotal,
        shipping_cost=document.shipping_cost,
        shipping_included=document.shipping_included,
        vat=document.vat,
        grand_total=document.grand_total,
        lead_time=_clean_text(document.lead_time),
        moq=_clean_text(document.moq),
        payment_terms=_clean_text(document.payment_terms),
        validity=_clean_text(document.validity),
        quality_terms=_clean_text(document.quality_terms),
        remarks=_clean_text(document.remarks),
        missing_fields=missing_fields,
        warnings=warnings,
        parser_version=parser_version,
    )


def _failed_ai_quote(
    extracted: ExtractionResult, parser_version: str
) -> StructuredQuote:
    return StructuredQuote(
        original_name=extracted.original_name,
        saved_name=extracted.saved_name,
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
        missing_fields=["supplierName", "items", "quantity", "grandTotal"],
        warnings=["AI 견적 구조화에 실패했습니다. 잠시 후 다시 시도해 주세요."],
        parser_version=parser_version,
    )


def structure_extracted_quotes(
    extracted_results: list[ExtractionResult],
    provider: QuoteAIProvider | None = None,
    *,
    resolve_provider: bool = True,
) -> tuple[list[StructuredQuote], str]:
    selected_provider = get_quote_ai_provider() if resolve_provider else provider
    if selected_provider is None:
        return [parse_quote(item) for item in extracted_results], "rules"

    results: list[StructuredQuote] = []
    for extracted in extracted_results:
        if extracted.status != "success" or not extracted.extracted_text.strip():
            results.append(parse_quote(extracted))
            continue
        try:
            document = selected_provider.structure_quote(extracted.extracted_text)
            results.append(
                _from_ai_document(
                    extracted,
                    document,
                    selected_provider.parser_version,
                )
            )
        except AIProviderError:
            results.append(
                _failed_ai_quote(extracted, selected_provider.parser_version)
            )
    return results, "ai"
