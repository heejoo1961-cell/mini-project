import Link from "next/link";

export function WorkflowActions({
  previous,
  next,
  nextEnabled = true,
  secondary,
}: {
  previous?: { href: string; label: string };
  next?: { href: string; label: string };
  nextEnabled?: boolean;
  secondary?: React.ReactNode;
}) {
  return (
    <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
      <div>{previous && <Link className="btn-secondary" href={previous.href}>{previous.label}</Link>}</div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {secondary}
        {next && (nextEnabled ? (
          <Link className="btn-primary" href={next.href}>{next.label}</Link>
        ) : (
          <button className="btn-primary" disabled type="button" title="이전 단계를 먼저 완료해 주세요.">{next.label}</button>
        ))}
      </div>
    </div>
  );
}
