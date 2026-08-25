import type { ComparisonSupplier } from "../../lib/api/compareQuotes";
import { ComparisonWarnings } from "./ComparisonWarnings";
import { VisualizationSelector } from "./VisualizationSelector";
import { supplierDisplayName } from "./comparisonDisplay";
import { VIEW_OPTIONS, VisualizationViews } from "./visualizationConfig";

export function WarningVisualization({ suppliers, warnings, view, onChange }: { suppliers: ComparisonSupplier[]; warnings: string[]; view: VisualizationViews["warnings"]; onChange: (view: VisualizationViews["warnings"]) => void }) {
  return <section><div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-[17px] font-semibold text-text">확인 필요 사항</h2><VisualizationSelector label="확인 필요 사항" onChange={onChange} options={VIEW_OPTIONS.warnings} value={view} /></div>{view === "list" ? <ComparisonWarnings warnings={warnings} /> : <div className="divide-y divide-line rounded-md border border-line border-l-[3px] border-l-accent bg-white px-4">{suppliers.filter((supplier) => supplier.status !== "comparable").map((supplier) => <article className="grid gap-2 py-3 sm:grid-cols-[14rem_1fr]" key={supplier.savedName}><h3 className="text-sm font-semibold text-text">{supplierDisplayName(supplier)}</h3><p className="text-[13px] leading-5 text-muted">{supplier.warnings.find((entry) => /[가-힣]/.test(entry)) ?? "표시된 거래조건을 공급업체에 확인해야 합니다."}</p></article>)}{warnings.length === 0 && <p className="py-3 text-[13px] text-success">추가 확인이 필요한 주요 조건이 없습니다.</p>}</div>}</section>;
}

