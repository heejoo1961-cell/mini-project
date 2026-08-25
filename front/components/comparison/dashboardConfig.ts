export type DashboardWidgetId = "summary" | "total-cost" | "cost-composition" | "lead-time" | "supplier-table" | "item-price";
export type DashboardWidgetSetting = { id: DashboardWidgetId; visible: boolean; order: number };
export const DASHBOARD_STORAGE_KEY = "quote-dashboard-layout";
export const WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  summary: "핵심 지표", "total-cost": "총구매비용 비교", "cost-composition": "비용 구성", "lead-time": "납기 비교", "supplier-table": "공급업체 종합 비교표", "item-price": "품목별 단가 비교표",
};
export const DEFAULT_WIDGETS: DashboardWidgetSetting[] = [
  { id: "summary", visible: true, order: 1 }, { id: "total-cost", visible: true, order: 2 }, { id: "cost-composition", visible: true, order: 3 }, { id: "lead-time", visible: true, order: 4 }, { id: "supplier-table", visible: true, order: 5 }, { id: "item-price", visible: true, order: 6 },
];
export function freshDefaultWidgets(): DashboardWidgetSetting[] { return DEFAULT_WIDGETS.map((widget) => ({ ...widget })); }
