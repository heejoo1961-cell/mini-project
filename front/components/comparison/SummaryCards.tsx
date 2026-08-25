import type { ReactNode } from "react";
import { formatMoney } from "../workflow/formatters";

type Props = { total: number; comparable: number; conditional: number; benchmark: number | null; shortestLead: number | null; headerAction?: ReactNode };
export function SummaryCards({ total, comparable, conditional, benchmark, shortestLead, headerAction }: Props) {
  const metrics = [["전체 공급업체", `${total}개`], ["비교 가능한 공급업체", `${comparable}개`], ["조건 확인 필요", `${conditional}개`], ["비교 기준 총액", formatMoney(benchmark)], ["최단 납기", shortestLead === null ? "확인 필요" : `${shortestLead}일`]];
  return <section aria-label="핵심 지표" className="dashboard-panel overflow-hidden"><header className="dashboard-panel-header"><div><h2 className="text-lg font-bold text-text">핵심 지표</h2><p className="mt-1 text-sm text-muted">비교 대상과 기준금액을 요약합니다.</p></div>{headerAction}</header><div className="grid grid-cols-2 xl:grid-cols-5">{metrics.map(([label, value], index) => <article className={`min-w-0 border-line px-5 py-4 ${index % 2 === 1 ? "border-l" : ""} ${index >= 2 ? "border-t xl:border-t-0" : ""} xl:border-l xl:first:border-l-0`} key={label}><p className="text-sm font-semibold text-muted">{label}</p><p className="mt-1 break-words text-right text-[20px] font-bold leading-7 tabular-nums text-text">{value}</p></article>)}</div></section>;
}
