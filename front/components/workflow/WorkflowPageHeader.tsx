export function WorkflowPageHeader({
  step,
  title,
  description,
  compact = false,
}: {
  step: number;
  title: string;
  description: string;
  compact?: boolean;
}) {
  const englishSteps = ["QUOTE UPLOAD", "TEXT EXTRACTION", "QUOTE STRUCTURING", "SUPPLIER COMPARISON"];
  return (
    <section className={`relative left-1/2 w-screen -translate-x-1/2 border-b border-line bg-white ${compact ? "mb-5" : "mb-8"}`}>
      <div className={`app-container ${compact ? "py-7 sm:py-8" : "py-10"}`}>
        <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1a26ff]">STEP {String(step).padStart(2, "0")} · {englishSteps[step - 1]}</p>
        <h1 className="text-[32px] font-medium tracking-[-0.96px] text-text sm:text-[44px]">{title}</h1>
        <p className="mt-3 max-w-3xl text-base text-muted">{description}</p>
      </div>
    </section>
  );
}
