"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WorkflowStep, useQuoteWorkflow } from "../../context/QuoteWorkflowContext";

const steps: Array<{ step: WorkflowStep; href: string; label: string; blocked: string }> = [
  { step: "upload", href: "/upload", label: "업로드", blocked: "항상 이동 가능" },
  { step: "extract", href: "/extract", label: "원문 확인", blocked: "PDF 업로드를 먼저 완료해 주세요." },
  { step: "structure", href: "/structure", label: "항목 검토", blocked: "원문 추출을 먼저 완료해 주세요." },
  { step: "compare", href: "/compare", label: "견적 비교", blocked: "구조화된 견적서가 2개 이상 필요합니다." },
];

export function StepNavigation() {
  const pathname = usePathname();
  const workflow = useQuoteWorkflow();
  const statuses: Record<WorkflowStep, string> = { upload: workflow.uploadStatus, extract: workflow.extractionStatus, structure: workflow.structureStatus, compare: workflow.comparisonStatus };

  return <nav aria-label="견적 분석 단계" className="h-full min-w-0 flex-1 overflow-x-auto"><ol className="flex h-full min-w-[430px] items-center gap-5 md:gap-8">{steps.map((item) => {
    const current = pathname === item.href;
    const available = workflow.access[item.step];
    const status = statuses[item.step];
    const classes = `relative flex h-full items-center whitespace-nowrap text-sm transition-colors ${current ? "font-semibold text-white" : status === "error" ? "text-[#f97066]" : available ? "text-[#aeb4bf] hover:text-white" : "cursor-not-allowed text-[#606670]"}`;
    const content = <>{status === "success" && !current && <span className="mr-1.5 text-xs text-[#33d17a]">✓</span>}{item.label}{current && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#0007cd]" />}</>;

    return <li className="h-full" key={item.step}>{available ? <Link aria-current={current ? "step" : undefined} className={classes} href={item.href}>{content}</Link> : <button aria-disabled="true" className={classes} disabled title={item.blocked} type="button">{content}</button>}</li>;
  })}</ol></nav>;
}
