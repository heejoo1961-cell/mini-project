import type { ReactNode } from "react";
import type { ComparisonSupplier } from "../../lib/api/compareQuotes";
import { formatMoney } from "../workflow/formatters";
import { supplierDisplayName } from "./comparisonDisplay";

const colors = ["bg-[#0007cd]", "bg-[#666666]", "bg-[#333333]"];

export function CostComposition({ suppliers, headerAction }: { suppliers: ComparisonSupplier[]; headerAction?: ReactNode }) {
  return <section className="rounded-md border border-line bg-white p-5"><header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-[17px] font-semibold text-text">비용 구성</h2><p className="mt-1 text-[13px] text-muted">품목금액·운송비·부가세의 구성입니다.</p></div>{headerAction}</header><div className="mt-4 divide-y divide-line border-y border-line">{suppliers.length === 0 && <p className="py-3 text-[13px] text-muted">표시할 비용 구성이 없습니다.</p>}{suppliers.map((supplier) => {
    const parts = [supplier.subtotal, supplier.shippingCost, supplier.vat];
    const sum = parts.reduce<number>((total, value) => total + (value ?? 0), 0);
    const conditional = supplier.status === "conditional";
    return <article className="grid gap-3 py-4 lg:grid-cols-[14rem_1fr_9rem] lg:items-center" key={supplier.savedName} title={supplier.warnings.join(" · ")}><div><h3 className="text-sm font-semibold text-text">{supplierDisplayName(supplier)}</h3>{conditional && <span className="mt-1 inline-flex items-center gap-1 text-xs text-warning"><i className="h-2 w-2 rounded-full bg-[#8a4b08]" />조건 확인</span>}</div><div><div aria-label={`${supplierDisplayName(supplier)} 비용 구성`} className={`flex h-5 overflow-hidden bg-[#eef0f3] ${conditional ? "border border-dashed border-[#aeb7c2]" : ""}`} role="img">{sum > 0 && parts.map((value, index) => value !== null && value > 0 ? <span className={colors[index]} key={index} style={{ width: `${value / sum * 100}%` }} /> : null)}</div><dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted"><div><dt className="inline">품목금액 </dt><dd className="inline tabular-nums text-text">{formatMoney(supplier.subtotal)}</dd></div><div><dt className="inline">운송비 </dt><dd className="inline tabular-nums text-text">{supplier.shippingIncluded === true ? "포함" : formatMoney(supplier.shippingCost)}</dd></div><div><dt className="inline">부가세 </dt><dd className="inline tabular-nums text-text">{formatMoney(supplier.vat)}</dd></div></dl></div><p className="text-right text-sm font-semibold tabular-nums text-text">{formatMoney(supplier.grandTotal)}</p></article>;
  })}</div></section>;
}
