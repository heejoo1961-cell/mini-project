"use client";

import { useEffect } from "react";

import { useQuoteWorkflow } from "../../context/QuoteWorkflowContext";
import { WorkflowActions } from "../workflow/WorkflowActions";
import { WorkflowPageHeader } from "../workflow/WorkflowPageHeader";
import { ComparisonDashboard } from "./ComparisonDashboard";

export function ComparisonStep() {
  const workflow = useQuoteWorkflow();
  const { comparisonResult, comparisonStatus, runComparison } = workflow;

  useEffect(() => {
    if (comparisonStatus === "idle" && !comparisonResult) void runComparison();
  }, [comparisonResult, comparisonStatus, runComparison]);

  return (
    <>
      <WorkflowPageHeader
        compact
        description="총구매비용과 납기, MOQ, 거래조건을 동일한 기준으로 비교합니다."
        step={4}
        title="공급업체 견적 비교"
      />
      {comparisonStatus === "loading" && <div className="rounded-md border border-line bg-white p-10 text-center text-sm font-semibold text-text">공급업체 견적을 비교하고 있습니다…</div>}
      {workflow.comparisonError && <div className="rounded-md border border-[#e6b8b3] bg-white p-5" role="alert"><p className="font-semibold text-error">공급업체 비교에 실패했습니다</p><p className="mt-1 text-[13px] text-[#7a332c]">{workflow.comparisonError}</p><button className="btn-primary mt-4 !min-h-9 text-sm" onClick={() => void workflow.runComparison(true)} type="button">다시 비교</button></div>}
      {comparisonResult && <ComparisonDashboard result={comparisonResult} />}
      <WorkflowActions previous={{ href: "/structure", label: "이전: 견적 항목 확인" }} />
    </>
  );
}
