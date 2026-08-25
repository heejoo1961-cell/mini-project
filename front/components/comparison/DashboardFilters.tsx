import type { ComparisonEntryStatus, ComparisonSupplier } from "../../lib/api/compareQuotes";
import { statusLabel, supplierDisplayName } from "./comparisonDisplay";

export type DashboardFilterState = { status: "all" | ComparisonEntryStatus; item: string; supplierIds: string[]; includeConditional: boolean };
type Props = { filters: DashboardFilterState; suppliers: ComparisonSupplier[]; items: string[]; onChange: (filters: DashboardFilterState) => void };

export function DashboardFilters({ filters, suppliers, items, onChange }: Props) {
  function toggleSupplier(savedName: string) {
    const selected = filters.supplierIds.includes(savedName) ? filters.supplierIds.filter((id) => id !== savedName) : [...filters.supplierIds, savedName];
    onChange({ ...filters, supplierIds: selected });
  }

  return <section aria-label="비교 필터" className="rounded-md border border-line bg-white px-4 py-3"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr_auto] lg:items-end">
    <label className="block text-[13px] font-medium text-text">상태<select className="mt-1 h-9 w-full rounded-md border border-line bg-white px-3 font-normal text-text outline-none focus:border-[#8957ff]" onChange={(event) => onChange({ ...filters, status: event.target.value as DashboardFilterState["status"] })} value={filters.status}><option value="all">전체</option>{(Object.keys(statusLabel) as ComparisonEntryStatus[]).map((status) => <option key={status} value={status}>{statusLabel[status]}</option>)}</select></label>
    <label className="block text-[13px] font-medium text-text">품목<select className="mt-1 h-9 w-full rounded-md border border-line bg-white px-3 font-normal text-text outline-none focus:border-[#8957ff]" onChange={(event) => onChange({ ...filters, item: event.target.value })} value={filters.item}><option value="all">전체 품목</option>{items.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
    <div className="relative text-[13px] font-medium text-text"><span>공급업체</span><details className="group relative mt-1"><summary className="flex h-9 cursor-pointer list-none items-center justify-between rounded-md border border-line bg-white px-3 font-normal"><span>{filters.supplierIds.length}개 선택</span><span aria-hidden="true" className="text-muted">▾</span></summary><div className="absolute left-0 top-10 z-30 max-h-64 w-full min-w-60 overflow-y-auto rounded-md border border-line bg-white p-2">{suppliers.map((supplier) => <label className="flex cursor-pointer items-center gap-2 px-2 py-2 text-[13px] font-normal hover:bg-surface-alt" key={supplier.savedName}><input checked={filters.supplierIds.includes(supplier.savedName)} className="accent-[#8957ff]" onChange={() => toggleSupplier(supplier.savedName)} type="checkbox" />{supplierDisplayName(supplier)}</label>)}</div></details></div>
    <label className="flex h-9 cursor-pointer items-center gap-2 text-[13px] font-medium text-text"><input checked={filters.includeConditional} className="h-4 w-4 accent-[#8957ff]" onChange={(event) => onChange({ ...filters, includeConditional: event.target.checked })} type="checkbox" />조건부 견적 포함</label>
  </div></section>;
}

