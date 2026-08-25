type Option<T extends string> = { value: T; label: string };

export function VisualizationSelector<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Option<T>[]; onChange: (value: T) => void }) {
  return <label className="flex items-center gap-2 text-[13px] text-muted"><span>보기</span><select aria-label={`${label} 보기 선택`} className="h-10 min-w-[140px] rounded-lg border border-line bg-surface px-3 text-sm text-text outline-none focus:border-[#0007cd]" onChange={(event) => onChange(event.target.value as T)} value={value}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
