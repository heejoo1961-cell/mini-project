import re
from dataclasses import dataclass
from datetime import date

from .extraction import ExtractionResult

PARSER_VERSION = "rule-based-v1"
MONEY_PATTERN = re.compile(
    r"^\s*(?:KRW\s*)?[₩]?\s*([0-9][0-9,]*)\s*원?\s*$", re.IGNORECASE
)
INCLUDED_PATTERN = re.compile(
    r"\b(?:included|incl\.)\b|배송비\s*포함|운송비\s*포함", re.IGNORECASE
)
EXCLUDED_PATTERN = re.compile(
    r"\b(?:excluded|separate)\b|배송비\s*별도|운송비\s*별도", re.IGNORECASE
)


@dataclass(frozen=True)
class QuoteItem:
    item_name: str | None
    specification: str | None
    quantity: int | None
    unit: str | None
    unit_price: int | None
    amount: int | None

    def to_dict(self) -> dict[str, str | int | None]:
        return {
            "itemName": self.item_name,
            "specification": self.specification,
            "quantity": self.quantity,
            "unit": self.unit,
            "unitPrice": self.unit_price,
            "amount": self.amount,
        }


@dataclass(frozen=True)
class StructuredQuote:
    original_name: str
    saved_name: str
    status: str
    supplier_name: str | None
    quote_number: str | None
    quote_date: str | None
    currency: str | None
    items: list[QuoteItem]
    subtotal: int | None
    shipping_cost: int | None
    shipping_included: bool | None
    vat: int | None
    grand_total: int | None
    lead_time: str | None
    moq: str | None
    payment_terms: str | None
    validity: str | None
    quality_terms: str | None
    remarks: str | None
    missing_fields: list[str]
    warnings: list[str]
    parser_version: str = PARSER_VERSION

    def to_dict(self) -> dict[str, object]:
        return {
            "originalName": self.original_name,
            "savedName": self.saved_name,
            "status": self.status,
            "parserVersion": self.parser_version,
            "supplierName": self.supplier_name,
            "quoteNumber": self.quote_number,
            "quoteDate": self.quote_date,
            "currency": self.currency,
            "items": [item.to_dict() for item in self.items],
            "subtotal": self.subtotal,
            "shippingCost": self.shipping_cost,
            "shippingIncluded": self.shipping_included,
            "vat": self.vat,
            "grandTotal": self.grand_total,
            "leadTime": self.lead_time,
            "moq": self.moq,
            "paymentTerms": self.payment_terms,
            "validity": self.validity,
            "qualityTerms": self.quality_terms,
            "remarks": self.remarks,
            "missingFields": self.missing_fields,
            "warnings": self.warnings,
        }


def parse_money(value: str | None) -> int | None:
    if value is None:
        return None
    match = MONEY_PATTERN.fullmatch(value)
    if not match:
        return None
    return int(match.group(1).replace(",", ""))


def _normalized_lines(text: str) -> list[str]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return [
        line
        for line in lines
        if not re.fullmatch(r"--- Page \d+ ---", line, re.IGNORECASE)
    ]


def _find_sequence(lines: list[str], sequence: list[str]) -> int | None:
    expected = [item.casefold() for item in sequence]
    for index in range(len(lines) - len(sequence) + 1):
        if [item.casefold() for item in lines[index : index + len(sequence)]] == expected:
            return index
    return None


def _find_label_index(
    lines: list[str], aliases: tuple[str, ...], start: int = 0
) -> int | None:
    targets = {alias.casefold() for alias in aliases}
    for index in range(start, len(lines)):
        if lines[index].casefold() in targets:
            return index
    return None


def _value_after_label(
    lines: list[str], aliases: tuple[str, ...], start: int = 0
) -> str | None:
    index = _find_label_index(lines, aliases, start)
    if index is None or index + 1 >= len(lines):
        return None
    return lines[index + 1]


def _inline_value(text: str, label: str) -> str | None:
    match = re.search(
        rf"(?im)^{re.escape(label)}\s*:\s*(.+?)\s*$",
        text,
    )
    return match.group(1).strip() if match else None


def _parse_date(value: str | None) -> str | None:
    if value is None:
        return None
    candidate = value.strip()
    try:
        return date.fromisoformat(candidate).isoformat()
    except ValueError:
        return candidate


def _parse_quantity_and_unit(value: str) -> tuple[int | None, str | None]:
    match = re.fullmatch(r"\s*([0-9][0-9,]*)\s*([A-Za-z가-힣]+)?\s*", value)
    if not match:
        return None, None
    return int(match.group(1).replace(",", "")), match.group(2)


def _find_table_end(lines: list[str], start: int) -> int:
    labels = {
        "goods subtotal",
        "supply amount",
        "subtotal",
        "shipping",
    }
    for index in range(start, len(lines)):
        if lines[index].casefold() in labels:
            return index
    return len(lines)


def _parse_items(lines: list[str]) -> tuple[list[QuoteItem], str | None]:
    standard_header = ["Item", "Specification", "Qty", "Unit", "Unit Price", "Amount"]
    numbered_header = [
        "No.",
        "Product",
        "Qty",
        "Unit Price (excl. VAT)",
        "Amount",
        "Ship.",
    ]
    moq_header = ["Item", "Description", "Qty", "Unit Price", "Amount", "MOQ"]

    header_index = _find_sequence(lines, standard_header)
    mode = "standard"
    header_size = len(standard_header)
    if header_index is None:
        header_index = _find_sequence(lines, numbered_header)
        mode = "numbered"
        header_size = len(numbered_header)
    if header_index is None:
        header_index = _find_sequence(lines, moq_header)
        mode = "moq"
        header_size = len(moq_header)
    if header_index is None:
        return [], None

    start = header_index + header_size
    end = _find_table_end(lines, start)
    rows = lines[start:end]
    items: list[QuoteItem] = []
    item_moqs: list[str] = []

    for offset in range(0, len(rows), 6):
        row = rows[offset : offset + 6]
        if len(row) < 6:
            break

        if mode == "standard":
            quantity, parsed_unit = _parse_quantity_and_unit(row[2])
            unit = row[3] or parsed_unit
            item = QuoteItem(
                item_name=row[0] or None,
                specification=row[1] or None,
                quantity=quantity,
                unit=unit,
                unit_price=parse_money(row[4]),
                amount=parse_money(row[5]),
            )
        elif mode == "numbered":
            quantity, unit = _parse_quantity_and_unit(row[2])
            product_parts = [part.strip() for part in row[1].split(" / ", maxsplit=1)]
            item = QuoteItem(
                item_name=product_parts[0] or None,
                specification=product_parts[1] if len(product_parts) == 2 else None,
                quantity=quantity,
                unit=unit,
                unit_price=parse_money(row[3]),
                amount=parse_money(row[4]),
            )
        else:
            quantity, unit = _parse_quantity_and_unit(row[2])
            item = QuoteItem(
                item_name=row[0] or None,
                specification=row[1] or None,
                quantity=quantity,
                unit=unit,
                unit_price=parse_money(row[3]),
                amount=parse_money(row[4]),
            )
            if row[5]:
                item_moqs.append(f"{row[0]}: {row[5]}")

        if item.item_name or item.amount is not None:
            items.append(item)

    return items, "; ".join(item_moqs) or None


def _supplier_name(lines: list[str]) -> str | None:
    quotation_index = _find_label_index(lines, ("QUOTATION",))
    if quotation_index is None:
        return None
    for line in lines[quotation_index + 1 :]:
        if line and not line.isdigit():
            return line
    return None


def _shipping(lines: list[str]) -> tuple[int | None, bool | None]:
    value = _value_after_label(lines, ("Shipping",))
    if value is None:
        return None, None
    if INCLUDED_PATTERN.search(value):
        return 0, True
    amount = parse_money(value)
    if amount is not None:
        return amount, False
    if EXCLUDED_PATTERN.search(value):
        return None, False
    return None, None


def _failed_quote(extracted: ExtractionResult) -> StructuredQuote:
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
        warnings=[extracted.error_message or "구조화할 PDF 원문이 없습니다."],
    )


def parse_quote(extracted: ExtractionResult) -> StructuredQuote:
    if extracted.status != "success" or not extracted.extracted_text.strip():
        return _failed_quote(extracted)

    text = extracted.extracted_text
    lines = _normalized_lines(text)
    items, item_moq = _parse_items(lines)
    subtotal = parse_money(
        _value_after_label(lines, ("Goods Subtotal", "Supply Amount", "Subtotal"))
    )
    shipping_cost, shipping_included = _shipping(lines)
    vat = parse_money(_value_after_label(lines, ("VAT", "VAT (10%)", "VAT 10%")))
    grand_total = parse_money(_value_after_label(lines, ("Grand Total", "Total")))

    total_index = _find_label_index(lines, ("Grand Total", "Total"))
    conditions_start = (total_index + 2) if total_index is not None else 0
    lead_time = _value_after_label(lines, ("Lead Time", "Delivery"), conditions_start)
    moq = _value_after_label(lines, ("MOQ",), conditions_start) or item_moq
    payment_terms = _value_after_label(lines, ("Payment",), conditions_start)
    validity = _value_after_label(lines, ("Validity",), conditions_start)
    quality_terms = _value_after_label(lines, ("Warranty", "Quality"), conditions_start)
    remarks = _value_after_label(lines, ("Remarks", "Included"), conditions_start)

    supplier_name = _supplier_name(lines)
    quote_number = _inline_value(text, "Quote No.")
    quote_date = _parse_date(_inline_value(text, "Quote Date"))
    currency = "KRW" if re.search(r"\bKRW\b|₩|[0-9]원", text, re.IGNORECASE) else None

    missing_fields: list[str] = []
    if supplier_name is None:
        missing_fields.append("supplierName")
    if not items:
        missing_fields.append("items")
    elif any(item.quantity is None for item in items):
        missing_fields.append("quantity")
    if grand_total is None:
        missing_fields.append("grandTotal")
    for field_name, value in (
        ("quoteNumber", quote_number),
        ("quoteDate", quote_date),
        ("currency", currency),
        ("subtotal", subtotal),
        ("leadTime", lead_time),
        ("moq", moq),
        ("paymentTerms", payment_terms),
        ("validity", validity),
    ):
        if value is None:
            missing_fields.append(field_name)
    if shipping_cost is None:
        missing_fields.append("shippingCost")

    warnings: list[str] = []
    important_condition = _value_after_label(lines, ("IMPORTANT CONDITION",))
    if important_condition:
        warnings.append(f"중요 조건 확인: {important_condition}")
    if shipping_cost is None and shipping_included is None:
        warnings.append("운송비 포함 여부를 확인할 수 없습니다.")
    elif shipping_cost is None and shipping_included is False:
        warnings.append("운송비가 별도이지만 금액을 확인할 수 없습니다.")
    item_amounts = [item.amount for item in items]
    if items and subtotal is not None and all(amount is not None for amount in item_amounts):
        if sum(amount for amount in item_amounts if amount is not None) != subtotal:
            warnings.append("품목별 금액 합계와 소계가 일치하지 않습니다.")
    if (
        subtotal is not None
        and shipping_cost is not None
        and vat is not None
        and grand_total is not None
        and subtotal + shipping_cost + vat != grand_total
    ):
        warnings.append("소계·운송비·부가세 합계와 최종 금액이 일치하지 않습니다.")

    major_values_found = sum(
        [supplier_name is not None, bool(items), grand_total is not None]
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
        supplier_name=supplier_name,
        quote_number=quote_number,
        quote_date=quote_date,
        currency=currency,
        items=items,
        subtotal=subtotal,
        shipping_cost=shipping_cost,
        shipping_included=shipping_included,
        vat=vat,
        grand_total=grand_total,
        lead_time=lead_time,
        moq=moq,
        payment_terms=payment_terms,
        validity=validity,
        quality_terms=quality_terms,
        remarks=remarks,
        missing_fields=missing_fields,
        warnings=warnings,
    )
