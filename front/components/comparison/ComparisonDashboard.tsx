"use client";

import { Fragment, useMemo, useState } from "react";

import type { CompareQuotesSuccess, ComparisonSupplier } from "../../lib/api/compareQuotes";
import { DashboardEditor } from "./DashboardEditor";
import { DashboardFilters, DashboardFilterState } from "./DashboardFilters";
import { DashboardViewPresets } from "./DashboardViewPresets";
import { CostCompositionVisualization } from "./CostCompositionVisualization";
import { ItemPriceVisualization } from "./ItemPriceVisualization";
import { LeadTimeVisualization } from "./LeadTimeVisualization";
import { SummaryVisualization } from "./SummaryVisualization";
import { SupplierConditionVisualization } from "./SupplierConditionVisualization";
import { TotalCostVisualization } from "./TotalCostVisualization";
import { WarningVisualization } from "./WarningVisualization";
import { DashboardWidgetId } from "./dashboardConfig";
import { useDashboardLayout } from "./useDashboardLayout";
import { useVisualizationPreferences } from "./useVisualizationPreferences";

type Props = { result: CompareQuotesSuccess };

function initialFilters(suppliers: ComparisonSupplier[]): DashboardFilterState {
  return { status: "all", item: "all", supplierIds: suppliers.map(({ savedName }) => savedName), includeConditional: true };
}

export function ComparisonDashboard({ result }: Props) {
  const [filters, setFilters] = useState<DashboardFilterState>(() => initialFilters(result.suppliers));
  const [editing, setEditing] = useState(false);
  const layout = useDashboardLayout();
  const visualization = useVisualizationPreferences();

  const visibleSuppliers = useMemo(() => result.suppliers.filter((supplier) =>
    filters.supplierIds.includes(supplier.savedName) &&
    (filters.status === "all" || supplier.status === filters.status) &&
    (filters.includeConditional || supplier.status !== "conditional")
  ), [filters, result.suppliers]);
  const visibleIds = useMemo(() => new Set(visibleSuppliers.map(({ savedName }) => savedName)), [visibleSuppliers]);
  const visibleGroups = useMemo(() => result.itemGroups
    .filter((group) => filters.item === "all" || group.normalizedItemName === filters.item)
    .map((group) => ({ ...group, offers: group.offers.filter((offer) => visibleIds.has(offer.savedName)) }))
    .filter((group) => group.offers.length > 0), [filters.item, result.itemGroups, visibleIds]);

  const shortestLead = Math.min(...result.suppliers.filter((supplier) => supplier.status === "comparable" && supplier.leadTimeDays !== null).map((supplier) => supplier.leadTimeDays as number));
  const shortestLeadValue = Number.isFinite(shortestLead) ? shortestLead : null;
  const warnings = visibleSuppliers.flatMap((supplier) => supplier.status === "comparable" ? [] : supplier.warnings.map((warning) => `${supplier.supplierName ?? supplier.originalName}: ${warning}`));
  const visibleWidgets = layout.widgets.filter(({ visible }) => visible);
  const warningIndex = visibleWidgets[0]?.id === "summary" ? 1 : 0;

  function resetFilters() { setFilters(initialFilters(result.suppliers)); }
  function resetDashboard() { layout.reset(); visualization.reset(); }

  function renderWidget(id: DashboardWidgetId) {
    switch (id) {
      case "summary": return <SummaryVisualization benchmark={result.benchmarkGrandTotal} comparable={result.suppliers.filter(({ status }) => status === "comparable").length} conditional={result.suppliers.filter(({ status }) => status === "conditional").length} onChange={(view) => visualization.setView("summary", view)} shortestLead={shortestLeadValue} total={result.suppliers.length} view={visualization.views.summary} />;
      case "total-cost": return <TotalCostVisualization benchmark={result.benchmarkGrandTotal} onChange={(view) => visualization.setView("totalCost", view)} suppliers={visibleSuppliers} view={visualization.views.totalCost} />;
      case "cost-composition": return <CostCompositionVisualization onChange={(view) => visualization.setView("costComposition", view)} suppliers={visibleSuppliers} view={visualization.views.costComposition} />;
      case "lead-time": return <LeadTimeVisualization onChange={(view) => visualization.setView("leadTime", view)} shortestLead={shortestLeadValue} suppliers={visibleSuppliers} view={visualization.views.leadTime} />;
      case "supplier-table": return <SupplierConditionVisualization benchmark={result.benchmarkGrandTotal} onChange={(view) => visualization.setView("supplierComparison", view)} suppliers={visibleSuppliers} view={visualization.views.supplierComparison} />;
      case "item-price": return <ItemPriceVisualization groups={visibleGroups} onChange={(view) => visualization.setView("itemPrice", view)} suppliers={visibleSuppliers} view={visualization.views.itemPrice} />;
    }
  }

  return <div className="space-y-4">
    <section className="flex justify-end gap-2 border-b border-line pb-4">
      <button aria-expanded={editing} className="btn-secondary !min-h-9 text-sm" onClick={() => setEditing((value) => !value)} type="button">화면 설정</button><button className="btn-secondary !min-h-9 text-sm" onClick={resetFilters} type="button">필터 초기화</button>
    </section>
    <DashboardEditor onClose={() => setEditing(false)} onMove={layout.move} onReset={resetDashboard} onToggle={layout.toggle} open={editing} widgets={layout.widgets} />
    <DashboardViewPresets onSelect={visualization.applyPreset} preset={visualization.preset} />
    <DashboardFilters filters={filters} items={result.itemGroups.map(({ normalizedItemName }) => normalizedItemName)} onChange={setFilters} suppliers={result.suppliers} />
    {!filters.includeConditional && <div className="border border-line border-l-[3px] border-l-accent bg-white px-5 py-4 text-sm text-muted" role="status">조건 확인이 필요한 견적을 현재 비교에서 제외했습니다.</div>}
    <div className="space-y-4">
      {visibleWidgets.map(({ id }, index) => <Fragment key={id}>
        {index === warningIndex && <div className="lg:col-span-2"><WarningVisualization onChange={(view) => visualization.setView("warnings", view)} suppliers={visibleSuppliers} view={visualization.views.warnings} warnings={warnings} /></div>}
        <div>{renderWidget(id)}</div>
      </Fragment>)}
      {warningIndex === visibleWidgets.length && <div className="lg:col-span-2"><WarningVisualization onChange={(view) => visualization.setView("warnings", view)} suppliers={visibleSuppliers} view={visualization.views.warnings} warnings={warnings} /></div>}
    </div>
  </div>;
}
