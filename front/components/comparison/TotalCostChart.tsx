import type { ReactNode } from "react";
import type { ComparisonSupplier } from "../../lib/api/compareQuotes";
import { formatBenchmarkDifference, formatMoney } from "../workflow/formatters";
import { statusLabel, supplierDisplayName } from "./comparisonDisplay";

export function TotalCostChart({ suppliers, benchmark, headerAction }: { suppliers: ComparisonSupplier[]; benchmark: number | null; headerAction?: ReactNode }) {
  const maximum = Math.max(0, ...suppliers.map((supplier) => supplier.grandTotal ?? 0));
  return <section className="rounded-md border border-line bg-white p-5"><header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-[17px] font-semibold text-text">총구매비용 비교</h2><p className="mt-1 text-[13px] text-muted">업체별 견적금액과 가격 적용 조건을 비교합니다.</p></div>{headerAction}</header><div className="mt-5 space-y-5">{suppliers.length === 0 && <p className="bg-surface-alt p-3 text-[13px] text-muted">필터 조건에 해당하는 공급업체가 없습니다.</p>}{suppliers.map((supplier) => {
    const amount = supplier.grandTotal;
    const width = amount !== null && maximum > 0 ? Math.max(2, amount / maximum * 100) : 0;
    const isBenchmark = supplier.status === "comparable" && amount === benchmark;
    const conditional = supplier.status === "conditional";
    return <div key={supplier.savedName}><div className="mb-2 flex flex-wrap items-end justify-between gap-2"><div><p className="text-sm font-semibold text-text">{supplierDisplayName(supplier)}</p><p className={`text-xs ${conditional ? "text-warning" : "text-muted"}`}>{conditional ? "● 조건 확인" : statusLabel[supplier.status]}</p></div><div className="text-right"><p className="text-sm font-semibold tabular-nums text-text">{formatMoney(amount)}</p><p className="text-xs text-muted">{isBenchmark ? "비교 기준" : formatBenchmarkDifference(supplier.status, supplier.differenceFromBenchmark, supplier.differenceRate)}</p></div></div>{amount === null ? <p className="bg-surface-alt px-3 py-2 text-[13px] text-muted">금액 확인 필요</p> : <div aria-label={`${supplierDisplayName(supplier)} 총구매비용 ${formatMoney(amount)}`} className={`h-3 overflow-hidden bg-[#eef0f3] ${conditional ? "border border-dashed border-[#aeb7c2]" : ""}`} role="img" tabIndex={0} title={supplier.warnings.join(" · ") || statusLabel[supplier.status]}><div className={`h-full ${conditional ? "bg-[#d7dce2]" : supplier.status === "comparable" ? "bg-[#264b73]" : "bg-[#aeb7c2]"}`} style={{ width: `${width}%` }} /></div>}</div>;
  })}</div></section>;
}

