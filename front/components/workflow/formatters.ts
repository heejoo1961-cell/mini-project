import type {
  ComparisonEntryStatus,
  ComparisonOffer,
  ComparisonSupplier,
} from "../../lib/api/compareQuotes";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatMoney(value: number | null): string {
  return value === null ? "확인 필요" : `${value.toLocaleString("ko-KR")}원`;
}

export function displayValue(value: string | number | null): string {
  if (value === null) return "확인 필요";
  return typeof value === "number" ? value.toLocaleString("ko-KR") : value;
}

export function formatBenchmarkDifference(
  status: ComparisonEntryStatus,
  difference: number | null,
  rate: number | null,
): string {
  if (status === "conditional" || status === "not_comparable") return "비교 제외";
  if (status === "incomplete" || difference === null || rate === null) return "확인 필요";
  if (difference === 0) return "기준";
  return `+${difference.toLocaleString("ko-KR")}원 · +${rate.toFixed(2)}%`;
}

export function formatMoqResult(offer: ComparisonOffer): string {
  if (offer.moqQuantity === null || offer.moqMet === null) return "확인 필요";
  return `${offer.moqQuantity.toLocaleString("ko-KR")} · ${offer.moqMet ? "충족" : "미충족"}`;
}

export function formatShipping(supplier: ComparisonSupplier): string {
  if (supplier.shippingIncluded === true) return "포함 (0원)";
  return formatMoney(supplier.shippingCost);
}
