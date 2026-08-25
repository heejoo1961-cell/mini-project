import type { UploadedPdf } from "./uploadQuote";

export type StructureStatus = "success" | "partial" | "failed";

export type StructuredQuoteItem = {
  itemName: string | null;
  specification: string | null;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  amount: number | null;
};

export type StructuredQuote = {
  originalName: string;
  savedName: string;
  status: StructureStatus;
  parserVersion: string;
  supplierName: string | null;
  quoteNumber: string | null;
  quoteDate: string | null;
  currency: string | null;
  items: StructuredQuoteItem[];
  subtotal: number | null;
  shippingCost: number | null;
  shippingIncluded: boolean | null;
  vat: number | null;
  grandTotal: number | null;
  leadTime: string | null;
  moq: string | null;
  paymentTerms: string | null;
  validity: string | null;
  qualityTerms: string | null;
  remarks: string | null;
  missingFields: string[];
  warnings: string[];
};

export type StructureQuotesSuccess = {
  message: string;
  results: StructuredQuote[];
};

type ErrorResponse = { status: "error"; code: string; message: string };

export class StructureQuotesError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "StructureQuotesError";
  }
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === "number";
}

function isItem(value: unknown): value is StructuredQuoteItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    isNullableString(item.itemName) &&
    isNullableString(item.specification) &&
    isNullableNumber(item.quantity) &&
    isNullableString(item.unit) &&
    isNullableNumber(item.unitPrice) &&
    isNullableNumber(item.amount)
  );
}

function isStructuredQuote(value: unknown): value is StructuredQuote {
  if (typeof value !== "object" || value === null) return false;
  const quote = value as Record<string, unknown>;
  const nullableStrings = [
    quote.supplierName,
    quote.quoteNumber,
    quote.quoteDate,
    quote.currency,
    quote.leadTime,
    quote.moq,
    quote.paymentTerms,
    quote.validity,
    quote.qualityTerms,
    quote.remarks,
  ];
  return (
    typeof quote.originalName === "string" &&
    typeof quote.savedName === "string" &&
    ["success", "partial", "failed"].includes(String(quote.status)) &&
    typeof quote.parserVersion === "string" &&
    nullableStrings.every(isNullableString) &&
    Array.isArray(quote.items) &&
    quote.items.every(isItem) &&
    [quote.subtotal, quote.shippingCost, quote.vat, quote.grandTotal].every(
      isNullableNumber,
    ) &&
    (quote.shippingIncluded === null ||
      typeof quote.shippingIncluded === "boolean") &&
    Array.isArray(quote.missingFields) &&
    quote.missingFields.every((item) => typeof item === "string") &&
    Array.isArray(quote.warnings) &&
    quote.warnings.every((item) => typeof item === "string")
  );
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  if (typeof value !== "object" || value === null) return false;
  const response = value as Record<string, unknown>;
  return (
    response.status === "error" &&
    typeof response.code === "string" &&
    typeof response.message === "string"
  );
}

export function isStructureQuotesSuccess(value: unknown): value is StructureQuotesSuccess {
  if (typeof value !== "object" || value === null) return false;
  const response = value as Record<string, unknown>;
  return (
    typeof response.message === "string" &&
    Array.isArray(response.results) &&
    response.results.every(isStructuredQuote)
  );
}

export async function structureQuotes(
  files: Pick<UploadedPdf, "originalName" | "savedName">[],
): Promise<StructureQuotesSuccess> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new StructureQuotesError(
      "Backend 주소가 설정되지 않았습니다.",
      "API_URL_NOT_CONFIGURED",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/quotes/structure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    });
  } catch {
    throw new StructureQuotesError(
      "Backend에 연결할 수 없습니다. 원문 추출 결과는 유지되므로 서버 상태를 확인한 뒤 다시 시도해 주세요.",
      "CONNECTION_FAILED",
    );
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (isErrorResponse(body)) {
      throw new StructureQuotesError(body.message, body.code);
    }
    throw new StructureQuotesError(
      "견적 항목 구조화 요청을 처리하지 못했습니다.",
      "INVALID_ERROR_RESPONSE",
    );
  }
  if (!isStructureQuotesSuccess(body)) {
    throw new StructureQuotesError(
      "견적 항목 구조화 응답 형식을 확인할 수 없습니다.",
      "INVALID_SUCCESS_RESPONSE",
    );
  }
  return body;
}
