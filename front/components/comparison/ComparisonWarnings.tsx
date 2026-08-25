export type WarningGroup = { supplier: string; primary: string; details: string[] };

function hasKorean(value: string) { return /[가-힣]/.test(value); }
function withoutSupplier(value: string) { return value.includes(":") ? value.slice(value.indexOf(":") + 1).trim() : value.trim(); }

export function groupWarnings(warnings: string[]): WarningGroup[] {
  const grouped = new Map<string, string[]>();
  warnings.forEach((warning) => {
    const split = warning.indexOf(":");
    const supplier = split >= 0 ? warning.slice(0, split).trim() : "공급업체 확인";
    const message = withoutSupplier(warning);
    const values = grouped.get(supplier) ?? [];
    if (!values.some((value) => value.replace(/\s/g, "") === message.replace(/\s/g, ""))) values.push(message);
    grouped.set(supplier, values);
  });
  return Array.from(grouped.entries()).map(([supplier, messages]: [string, string[]]) => {
    const korean = messages.filter((message: string) => hasKorean(message));
    const primary = korean.find((message: string) => /MOQ|수량|납기|가격|조건/.test(message)) ?? korean[0] ?? "표시된 거래조건을 공급업체에 확인해야 합니다.";
    return { supplier, primary, details: messages.filter((message) => message !== primary) };
  });
}

export function ComparisonWarnings({ warnings }: { warnings: string[] }) {
  const groups = groupWarnings(warnings);
  const hasWarnings = groups.length > 0;
  return <section aria-labelledby="warning-title" className="border border-line border-l-[3px] border-l-accent bg-white">
    <div className="flex items-start justify-between gap-6 px-5 py-4">
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-text" id="warning-title">{hasWarnings ? `조건 확인이 필요한 견적 ${groups.length}건` : "조건 확인 완료"}</h2>
        {hasWarnings ? <div className="mt-2 divide-y divide-line">{groups.map((group) => <article className="py-2 first:pt-0 last:pb-0" key={group.supplier}><p className="text-sm leading-6 text-muted"><strong className="font-semibold text-text">{group.supplier}</strong> — {group.primary}</p>{group.details.length > 0 && <details className="mt-1 text-[13px] text-muted"><summary className="cursor-pointer font-medium text-[#1a26ff]">상세 조건 보기</summary><ul className="mt-2 space-y-1 border-l border-line pl-3">{group.details.map((detail) => <li key={detail}>{detail}</li>)}</ul></details>}</article>)}</div> : <p className="mt-1 text-sm text-muted">추가로 확인해야 할 주요 거래조건이 없습니다.</p>}
      </div>
      <span className={`status-badge shrink-0 ${hasWarnings ? "border border-[#0007cd] bg-[#0007cd]/15 text-white" : "bg-[#33d17a]/10 text-success"}`}>{hasWarnings ? "조건부" : "확인 완료"}</span>
    </div>
  </section>;
}
