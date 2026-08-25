"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";

import { WorkflowStep, useQuoteWorkflow } from "../../context/QuoteWorkflowContext";

export function WorkflowRouteGate({ step, children }: { step: WorkflowStep; children: ReactNode }) {
  const router = useRouter();
  const { hydrated, access, setNotice } = useQuoteWorkflow();
  const allowed = access[step];

  useEffect(() => {
    if (!hydrated || allowed) return;
    setNotice("이 단계를 진행하려면 이전 단계를 먼저 완료해주세요.");
    const nearestRoute =
      step === "compare" && access.structure
        ? "/structure"
        : (step === "compare" || step === "structure") && access.extract
          ? "/extract"
          : "/upload";
    router.replace(nearestRoute);
  }, [access.extract, access.structure, allowed, hydrated, router, setNotice, step]);

  if (!hydrated || !allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <div className="rounded-lg border border-line bg-white px-6 py-5" role="status">
          <p className="font-semibold text-text">작업 상태를 불러오는 중입니다</p>
          <p className="mt-1 text-sm text-muted">잠시만 기다려 주세요.</p>
        </div>
      </main>
    );
  }
  return children;
}
