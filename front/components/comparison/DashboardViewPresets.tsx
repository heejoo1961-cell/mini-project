import type { DashboardPreset } from "./visualizationConfig";

export function DashboardViewPresets({ preset, onSelect }: { preset: DashboardPreset; onSelect: (preset: "default" | "visual" | "table") => void }) {
  const options = [
    { id: "default" as const, label: "기본 구성" },
    { id: "visual" as const, label: "시각화 중심" },
    { id: "table" as const, label: "표 중심" },
  ];
  return <section aria-label="전체 보기 설정" className="flex items-center justify-end gap-2 border-b border-line pb-3"><label className="flex items-center gap-2 text-[13px] text-muted"><span>전체 보기</span><select className="h-9 min-w-36 rounded-md border border-line bg-white px-3 text-[13px] text-text" onChange={(event) => onSelect(event.target.value as "default" | "visual" | "table")} value={preset}>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}{preset === "custom" && <option disabled value="custom">개별 설정</option>}</select></label></section>;
}
