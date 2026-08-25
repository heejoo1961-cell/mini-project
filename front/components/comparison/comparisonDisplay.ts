import type { ComparisonEntryStatus } from "../../lib/api/compareQuotes";
export const statusLabel: Record<ComparisonEntryStatus, string> = { comparable: "비교 가능", conditional: "조건 확인", incomplete: "정보 부족", not_comparable: "비교 제외" };
export const statusStyle: Record<ComparisonEntryStatus, string> = { comparable: "border border-[#33d17a]/40 bg-[#33d17a]/10 text-[#067647]", conditional: "border border-[#0007cd] bg-[#0007cd]/10 text-[#0007cd]", incomplete: "border border-[#ff4d4d]/40 bg-[#ff4d4d]/10 text-[#c4320a]", not_comparable: "border border-[#c7cdd4] bg-[#f6f7f9] text-[#667085]" };
export function supplierDisplayName(supplier: { supplierName: string | null; originalName: string }) { return supplier.supplierName ?? supplier.originalName; }
