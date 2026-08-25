import re
from collections import Counter
from dataclasses import dataclass

from .quote_parser import QuoteItem, StructuredQuote

COMPARISON_STATUSES = {"comparable", "conditional", "incomplete", "not_comparable"}
PRICE_WARNING_TERMS = ("가격", "금액", "합계", "최종", "MOQ", "적용", "재협상")


@dataclass(frozen=True)
class NormalizedItem:
    name: str
    matched_alias: bool


def normalize_item_name(item_name: str | None) -> NormalizedItem:
    if not item_name or not item_name.strip():
        return NormalizedItem("확인 필요 품목", False)

    cleaned = re.sub(r"[^0-9a-zA-Z가-힣]+", " ", item_name.casefold()).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)

    bag_pattern = r"(?:canvas|cotton|recycled\s+cotton|eco)\s*bag|\bbags?\b|에코백|캔버스\s*백"
    tumbler_pattern = r"\btumblers?\b|텀블러|스테인리[스즈]\s*텀블러|스테인레스\s*텀블러"
    if re.search(bag_pattern, cleaned, re.IGNORECASE):
        return NormalizedItem("Canvas Bag", True)
    if re.search(tumbler_pattern, cleaned, re.IGNORECASE):
        return NormalizedItem("Tumbler", True)
    return NormalizedItem(" ".join(word.capitalize() for word in cleaned.split()), False)


def parse_lead_time_days(lead_time: str | None) -> int | None:
    if not lead_time:
        return None
    match = re.search(r"(?<!\d)(\d+)\s*(?:days?|일)", lead_time, re.IGNORECASE)
    return int(match.group(1)) if match else None


def _number(value: str) -> int | None:
    match = re.search(r"(?<![\d,])([0-9][0-9,]*)", value)
    return int(match.group(1).replace(",", "")) if match else None


def parse_moq_by_item(moq: str | None) -> tuple[int | None, dict[str, int]]:
    if not moq:
        return None, {}

    if re.search(r"per\s+item|품목당", moq, re.IGNORECASE):
        return _number(moq), {}

    by_item: dict[str, int] = {}
    for segment in re.split(r"\s*[;/]\s*", moq):
        colon_match = re.fullmatch(r"(.+?):\s*([0-9][0-9,]*)(?:\s+.*)?", segment)
        if colon_match:
            normalized = normalize_item_name(colon_match.group(1))
            if normalized.matched_alias:
                by_item[normalized.name] = int(colon_match.group(2).replace(",", ""))
            continue

        number_first = re.fullmatch(r"([0-9][0-9,]*)\s+(.+)", segment)
        if number_first:
            normalized = normalize_item_name(number_first.group(2))
            if normalized.matched_alias:
                by_item[normalized.name] = int(number_first.group(1).replace(",", ""))

    return None, by_item


def _moq_for_item(quote: StructuredQuote, normalized_name: str) -> int | None:
    common_moq, item_moqs = parse_moq_by_item(quote.moq)
    return item_moqs.get(normalized_name, common_moq)


def _moq_met(item: QuoteItem, moq_quantity: int | None) -> bool | None:
    if item.quantity is None or moq_quantity is None:
        return None
    return item.quantity >= moq_quantity


def _round_rate(difference: int, benchmark: int) -> float:
    return round(difference / benchmark * 100, 2)


def _item_map(quote: StructuredQuote) -> dict[str, QuoteItem]:
    result: dict[str, QuoteItem] = {}
    for item in quote.items:
        normalized = normalize_item_name(item.item_name)
        result.setdefault(normalized.name, item)
    return result


def _modal_value(values: list[object]) -> object | None:
    if not values:
        return None
    counts = Counter(values)
    most_common = counts.most_common()
    if len(most_common) > 1 and most_common[0][1] == most_common[1][1]:
        return None
    return most_common[0][0]


def _price_warning(warning: str) -> bool:
    return any(term.casefold() in warning.casefold() for term in PRICE_WARNING_TERMS)


def compare_quotes(quotes: list[StructuredQuote]) -> dict[str, object]:
    item_maps = [_item_map(quote) for quote in quotes]
    item_sets = [tuple(sorted(items)) for items in item_maps if items]
    reference_item_set = _modal_value(item_sets)
    reference_items = set(reference_item_set) if isinstance(reference_item_set, tuple) else set()

    currencies = {quote.currency for quote in quotes if quote.currency is not None}
    common_currency = next(iter(currencies)) if len(currencies) == 1 else None

    reference_quantities: dict[str, int | None] = {}
    for normalized_name in reference_items:
        quantities = [
            items[normalized_name].quantity
            for items in item_maps
            if set(items) == reference_items and items[normalized_name].quantity is not None
        ]
        reference_quantities[normalized_name] = _modal_value(quantities)  # type: ignore[assignment]

    supplier_statuses: list[str] = []
    supplier_warnings: list[list[str]] = []
    price_applicabilities: list[str] = []

    for quote, items in zip(quotes, item_maps):
        warnings = list(quote.warnings)
        missing_required = (
            quote.status == "failed"
            or quote.supplier_name is None
            or quote.currency is None
            or quote.grand_total is None
            or not items
            or any(
                item.quantity is None or item.unit_price is None or item.amount is None
                for item in items.values()
            )
        )

        moq_states = [
            _moq_met(item, _moq_for_item(quote, normalized_name))
            for normalized_name, item in items.items()
        ]
        has_moq_failure = any(state is False for state in moq_states)
        has_unknown_moq = bool(moq_states) and any(state is None for state in moq_states)
        has_price_warning = any(_price_warning(warning) for warning in quote.warnings)

        if has_moq_failure or has_price_warning:
            price_applicability = "conditional"
        elif has_unknown_moq:
            price_applicability = "unknown"
        else:
            price_applicability = "applicable"

        currency_mismatch = common_currency is None and len(currencies) > 1
        item_mismatch = bool(reference_items) and set(items) != reference_items
        quantity_mismatch = any(
            reference_quantities.get(name) is None
            or items.get(name) is None
            or items[name].quantity != reference_quantities[name]
            for name in reference_items
        ) if reference_items else bool(items)

        if missing_required:
            status = "incomplete"
            warnings.append("비교에 필요한 품목·수량·단가 또는 최종금액 정보가 부족합니다.")
        elif currency_mismatch:
            status = "not_comparable"
            warnings.append("견적 통화가 달라 가격을 직접 비교할 수 없습니다.")
        elif not reference_items or item_mismatch:
            status = "not_comparable"
            warnings.append("제안 품목 구성이 달라 직접 비교할 수 없습니다.")
        elif quantity_mismatch:
            status = "not_comparable"
            warnings.append("품목별 견적 수량이 달라 직접 비교할 수 없습니다.")
        elif price_applicability != "applicable":
            status = "conditional"
            if has_moq_failure:
                warnings.append(
                    "요청 수량이 MOQ보다 적어 표시 가격으로 구매 가능한지 공급업체 확인이 필요합니다."
                )
            elif has_unknown_moq:
                warnings.append("MOQ 충족 여부를 숫자로 확인할 수 없습니다.")
        else:
            status = "comparable"

        supplier_statuses.append(status)
        supplier_warnings.append(list(dict.fromkeys(warnings)))
        price_applicabilities.append(price_applicability)

    comparable_totals = [
        quote.grand_total
        for quote, status in zip(quotes, supplier_statuses)
        if status == "comparable" and quote.grand_total is not None
    ]
    benchmark_grand_total = min(comparable_totals) if comparable_totals else None

    suppliers: list[dict[str, object]] = []
    for quote, status, applicability, warnings in zip(
        quotes, supplier_statuses, price_applicabilities, supplier_warnings
    ):
        difference = (
            quote.grand_total - benchmark_grand_total
            if status == "comparable"
            and quote.grand_total is not None
            and benchmark_grand_total is not None
            else None
        )
        suppliers.append(
            {
                "supplierName": quote.supplier_name,
                "originalName": quote.original_name,
                "savedName": quote.saved_name,
                "status": status,
                "priceApplicability": applicability,
                "subtotal": quote.subtotal,
                "shippingCost": quote.shipping_cost,
                "shippingIncluded": quote.shipping_included,
                "vat": quote.vat,
                "grandTotal": quote.grand_total,
                "differenceFromBenchmark": difference,
                "differenceRate": (
                    _round_rate(difference, benchmark_grand_total)
                    if difference is not None and benchmark_grand_total
                    else None
                ),
                "leadTime": quote.lead_time,
                "leadTimeDays": parse_lead_time_days(quote.lead_time),
                "moq": quote.moq,
                "paymentTerms": quote.payment_terms,
                "validity": quote.validity,
                "qualityTerms": quote.quality_terms,
                "remarks": quote.remarks,
                "warnings": warnings,
            }
        )

    all_group_names = sorted({name for items in item_maps for name in items})
    item_groups: list[dict[str, object]] = []
    for normalized_name in all_group_names:
        eligible_prices = [
            items[normalized_name].unit_price
            for items, status in zip(item_maps, supplier_statuses)
            if status == "comparable"
            and normalized_name in items
            and items[normalized_name].unit_price is not None
        ]
        benchmark_unit_price = min(eligible_prices) if eligible_prices else None
        offers: list[dict[str, object]] = []
        alias_matches: list[bool] = []

        for quote, items, supplier_status, applicability in zip(
            quotes, item_maps, supplier_statuses, price_applicabilities
        ):
            item = items.get(normalized_name)
            if item is None:
                continue
            normalized = normalize_item_name(item.item_name)
            alias_matches.append(normalized.matched_alias)
            moq_quantity = _moq_for_item(quote, normalized_name)
            moq_met = _moq_met(item, moq_quantity)
            difference = (
                item.unit_price - benchmark_unit_price
                if supplier_status == "comparable"
                and item.unit_price is not None
                and benchmark_unit_price is not None
                else None
            )
            offers.append(
                {
                    "supplierName": quote.supplier_name,
                    "savedName": quote.saved_name,
                    "status": supplier_status,
                    "priceApplicability": applicability,
                    "originalItemName": item.item_name,
                    "specification": item.specification,
                    "quantity": item.quantity,
                    "unit": item.unit,
                    "unitPrice": item.unit_price,
                    "amount": item.amount,
                    "moqQuantity": moq_quantity,
                    "moqMet": moq_met,
                    "differenceFromBenchmark": difference,
                    "differenceRate": (
                        _round_rate(difference, benchmark_unit_price)
                        if difference is not None and benchmark_unit_price
                        else None
                    ),
                }
            )

        comparable_offer_count = sum(
            offer["status"] == "comparable" for offer in offers
        )
        if comparable_offer_count >= 2:
            group_status = "comparable"
        elif any(offer["status"] == "conditional" for offer in offers):
            group_status = "conditional"
        elif any(offer["status"] == "incomplete" for offer in offers):
            group_status = "incomplete"
        else:
            group_status = "not_comparable"

        group_warnings: list[str] = []
        if offers and not any(alias_matches) and len(offers) == 1:
            group_warnings.append(
                "다른 견적의 품목과 명확히 매칭되지 않아 독립 품목으로 유지했습니다."
            )
        item_groups.append(
            {
                "normalizedItemName": normalized_name,
                "comparisonStatus": group_status,
                "benchmarkUnitPrice": benchmark_unit_price,
                "offers": offers,
                "warnings": group_warnings,
            }
        )

    comparison_warnings = [
        f"{quote.supplier_name or quote.original_name}: {warning}"
        for quote, status, warnings in zip(quotes, supplier_statuses, supplier_warnings)
        if status != "comparable"
        for warning in warnings
    ]
    return {
        "comparisonStatus": "completed",
        "currency": common_currency,
        "benchmarkGrandTotal": benchmark_grand_total,
        "suppliers": suppliers,
        "itemGroups": item_groups,
        "comparisonWarnings": comparison_warnings,
    }
