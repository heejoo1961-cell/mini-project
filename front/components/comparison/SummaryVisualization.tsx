import { formatMoney } from "../workflow/formatters";
import { SummaryCards } from "./SummaryCards";
import { VisualizationSelector } from "./VisualizationSelector";
import { VIEW_OPTIONS, VisualizationViews } from "./visualizationConfig";
type Metrics = { total: number; comparable: number; conditional: number; benchmark: number | null; shortestLead: number | null };
export function SummaryVisualization({ view, onChange, ...metrics }: Metrics & { view: VisualizationViews["summary"]; onChange: (view: VisualizationViews["summary"]) => void }) {
  const selector = <VisualizationSelector label="핵심 지표" onChange={onChange} options={VIEW_OPTIONS.summary} value={view} />;
  if (view === "cards") return <SummaryCards {...metrics} headerAction={selector} />;
  const rows = [["전체 공급업체", `${metrics.total}개`], ["비교 가능", `${metrics.comparable}개`], ["조건 확인 필요", `${metrics.conditional}개`], ["비교 기준 총액", formatMoney(metrics.benchmark)], ["최단 납기", metrics.shortestLead === null ? "확인 필요" : `${metrics.shortestLead}일`]];
  return <section className="rounded-md border border-line bg-white p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-[17px] font-semibold text-text">핵심 지표</h2>{selector}</div><div className="data-scroll mt-4"><table className="w-full"><thead><tr><th className="text-left" scope="col">지표</th><th className="text-right" scope="col">값</th></tr></thead><tbody>{rows.map(([label, value]) => <tr key={label}><th className="text-left font-normal" scope="row">{label}</th><td className="text-right font-semibold tabular-nums">{value}</td></tr>)}</tbody></table></div></section>;
}
