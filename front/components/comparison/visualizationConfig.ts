export type VisualizationViews = {
  summary: "cards" | "table";
  totalCost: "horizontal-bar" | "vertical-bar" | "dot" | "table";
  costComposition: "stacked-bar" | "grouped-bar" | "ratio-bar" | "table";
  leadTime: "horizontal-bar" | "vertical-bar" | "dot" | "table";
  supplierComparison: "pivot-table" | "cards" | "heatmap";
  itemPrice: "table" | "grouped-bar" | "dot" | "heatmap";
  warnings: "list" | "cards";
};
export type VisualizationKey = keyof VisualizationViews;
export type DashboardPreset = "default" | "visual" | "table" | "custom";
export type VisualizationState = { version: 2; preset: DashboardPreset; views: VisualizationViews };
export const VISUALIZATION_STORAGE_KEY = "quote-dashboard-visualization";
export const PRESET_VIEWS: Record<Exclude<DashboardPreset, "custom">, VisualizationViews> = {
  default: { summary: "cards", totalCost: "horizontal-bar", costComposition: "stacked-bar", leadTime: "horizontal-bar", supplierComparison: "pivot-table", itemPrice: "table", warnings: "list" },
  visual: { summary: "cards", totalCost: "vertical-bar", costComposition: "stacked-bar", leadTime: "dot", supplierComparison: "cards", itemPrice: "grouped-bar", warnings: "cards" },
  table: { summary: "table", totalCost: "table", costComposition: "table", leadTime: "table", supplierComparison: "pivot-table", itemPrice: "table", warnings: "list" },
};
export const VIEW_OPTIONS: { [K in VisualizationKey]: Array<{ value: VisualizationViews[K]; label: string }> } = {
  summary: [{ value: "cards", label: "카드" }, { value: "table", label: "간단 표" }],
  totalCost: [{ value: "horizontal-bar", label: "가로 막대" }, { value: "vertical-bar", label: "세로 막대" }, { value: "dot", label: "점 그래프" }, { value: "table", label: "데이터 표" }],
  costComposition: [{ value: "stacked-bar", label: "누적 막대" }, { value: "grouped-bar", label: "그룹 막대" }, { value: "ratio-bar", label: "구성비" }, { value: "table", label: "데이터 표" }],
  leadTime: [{ value: "horizontal-bar", label: "가로 막대" }, { value: "vertical-bar", label: "세로 막대" }, { value: "dot", label: "점 그래프" }, { value: "table", label: "데이터 표" }],
  supplierComparison: [{ value: "pivot-table", label: "피벗 테이블" }, { value: "cards", label: "공급업체 카드" }, { value: "heatmap", label: "조건 히트맵" }],
  itemPrice: [{ value: "table", label: "데이터 표" }, { value: "grouped-bar", label: "그룹 세로 막대" }, { value: "dot", label: "점 그래프" }, { value: "heatmap", label: "단가 히트맵" }],
  warnings: [{ value: "list", label: "통합 목록" }, { value: "cards", label: "공급업체별 카드" }],
};
