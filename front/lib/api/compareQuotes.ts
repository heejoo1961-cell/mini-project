import type { UploadedPdf } from "./uploadQuote";

export type ComparisonEntryStatus =
  | "comparable"
  | "conditional"
  | "incomplete"
  | "not_comparable";

export type PriceApplicability = "applicable" | "conditional" | "unknown";

export type ComparisonSupplier = {
  supplierName: string | null;
  originalName: string;
  savedName: string;
  status: ComparisonEntryStatus;
  priceApplicability: PriceApplicability;
  subtotal: number | null;
  shippingCost: number | null;
  shippingIncluded: boolean | null;
  vat: number | null;
  grandTotal: number | null;
  differenceFromBenchmark: number | null;
  differenceRate: number | null;
  leadTime: string | null;
  leadTimeDays: number | null;
  moq: string | null;
  paymentTerms: string | null;
  validity: string | null;
  qualityTerms: string | null;
  remarks: string | null;
  warnings: string[];
};

export type ComparisonOffer = {
  supplierName: string | null;
  savedName: string;
  status: ComparisonEntryStatus;
  priceApplicability: PriceApplicability;
  originalItemName: string | null;
  specification: string | null;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  amount: number | null;
  moqQuantity: number | null;
  moqMet: boolean | null;
  differenceFromBenchmark: number | null;
  differenceRate: number | null;
};

export type ComparisonItemGroup = {
  normalizedItemName: string;
  comparisonStatus: ComparisonEntryStatus;
  benchmarkUnitPrice: number | null;
  offers: ComparisonOffer[];
  warnings: string[];
};

export type CompareQuotesSuccess = {
  message: string;
  comparisonStatus: "completed";
  currency: string | null;
  benchmarkGrandTotal: number | null;
  suppliers: ComparisonSupplier[];
  itemGroups: ComparisonItemGroup[];
  comparisonWarnings: string[];
};

type ErrorResponse = { status: "error"; code: string; message: string };

export class CompareQuotesError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "CompareQuotesError";
  }
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === "number";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isStatus(value: unknown): value is ComparisonEntryStatus {
  return ["comparable", "conditional", "incomplete", "not_comparable"].includes(
    String(value),
  );
}

function isSupplier(value: unknown): value is ComparisonSupplier {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    isNullableString(item.supplierName) &&
    typeof item.originalName === "string" &&
    typeof item.savedName === "string" &&
    isStatus(item.status) &&
    ["applicable", "conditional", "unknown"].includes(String(item.priceApplicability)) &&
    [
      item.subtotal,
      item.shippingCost,
      item.vat,
      item.grandTotal,
      item.differenceFromBenchmark,
      item.differenceRate,
      item.leadTimeDays,
    ].every(isNullableNumber) &&
    [
      item.leadTime,
      item.moq,
      item.paymentTerms,
      item.validity,
      item.qualityTerms,
      item.remarks,
    ].every(isNullableString) &&
    (item.shippingIncluded === null || typeof item.shippingIncluded === "boolean") &&
    isStringArray(item.warnings)
  );
}

function isOffer(value: unknown): value is ComparisonOffer {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    isNullableString(item.supplierName) &&
    typeof item.savedName === "string" &&
    isStatus(item.status) &&
    ["applicable", "conditional", "unknown"].includes(String(item.priceApplicability)) &&
    [item.originalItemName, item.specification, item.unit].every(isNullableString) &&
    [
      item.quantity,
      item.unitPrice,
      item.amount,
      item.moqQuantity,
      item.differenceFromBenchmark,
      item.differenceRate,
    ].every(isNullableNumber) &&
    (item.moqMet === null || typeof item.moqMet === "boolean")
  );
}

function isItemGroup(value: unknown): value is ComparisonItemGroup {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.normalizedItemName === "string" &&
    isStatus(item.comparisonStatus) &&
    isNullableNumber(item.benchmarkUnitPrice) &&
    Array.isArray(item.offers) &&
    item.offers.every(isOffer) &&
    isStringArray(item.warnings)
  );
}

export function isCompareQuotesSuccess(value: unknown): value is CompareQuotesSuccess {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.message === "string" &&
    item.comparisonStatus === "completed" &&
    isNullableString(item.currency) &&
    isNullableNumber(item.benchmarkGrandTotal) &&
    Array.isArray(item.suppliers) &&
    item.suppliers.every(isSupplier) &&
    Array.isArray(item.itemGroups) &&
    item.itemGroups.every(isItemGroup) &&
    isStringArray(item.comparisonWarnings)
  );
}

function isError(value: unknown): value is ErrorResponse {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    item.status === "error" &&
    typeof item.code === "string" &&
    typeof item.message === "string"
  );
}

export async function compareQuotes(
  files: Pick<UploadedPdf, "originalName" | "savedName">[],
): Promise<CompareQuotesSuccess> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new CompareQuotesError(
      "Backend 주소가 설정되지 않았습니다.",
      "API_URL_NOT_CONFIGURED",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/quotes/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    });
  } catch {
    throw new CompareQuotesError(
      "Backend에 연결할 수 없어 공급업체 비교를 완료하지 못했습니다.",
      "CONNECTION_FAILED",
    );
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (isError(body)) throw new CompareQuotesError(body.message, body.code);
    throw new CompareQuotesError("공급업체 비교 요청을 처리하지 못했습니다.", "INVALID_ERROR_RESPONSE");
  }
  if (!isCompareQuotesSuccess(body)) {
    throw new CompareQuotesError("공급업체 비교 응답 형식을 확인할 수 없습니다.", "INVALID_SUCCESS_RESPONSE");
  }
  return body;
}
