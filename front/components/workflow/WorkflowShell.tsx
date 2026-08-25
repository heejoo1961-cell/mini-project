"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useQuoteWorkflow } from "../../context/QuoteWorkflowContext";
import { StepNavigation } from "./StepNavigation";

export function WorkflowShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { notice, resetWorkflow, setNotice } = useQuoteWorkflow();

  function startNewAnalysis() {
    if (!window.confirm("현재 분석 결과를 초기화하고 새 견적서를 분석할까요? 업로드한 원본 파일은 유지됩니다.")) return;
    resetWorkflow();
    router.push("/upload");
  }

  return (
    <main className="workflow-theme min-h-screen bg-canvas text-text">
      <header className="border-b border-[#222222] bg-[#0f0f0f] text-white">
        <div className="app-container flex h-16 items-center">
          <div className="mr-8 shrink-0 text-xl font-semibold tracking-[-0.02em] lg:mr-14">
            QUOTE<span className="brand-gradient-text">FLOW</span>
          </div>
          <StepNavigation />
          <button className="brand-gradient-border ml-auto hidden h-10 shrink-0 items-center rounded-lg px-[18px] text-sm font-medium text-white lg:inline-flex" onClick={startNewAnalysis} type="button">
            새 견적서 분석
          </button>
        </div>
      </header>
      <div className="app-container pb-12">
        {notice && (
          <div className="mt-6 flex items-start justify-between gap-4 rounded-lg border border-line border-l-[3px] border-l-[#0007cd] bg-surface px-5 py-4" role="status">
            <p className="text-sm leading-6 text-text">{notice}</p>
            <button className="btn-tertiary min-h-0 shrink-0 p-0 text-sm text-muted" onClick={() => setNotice("")} type="button">닫기</button>
          </div>
        )}
        {children}
      </div>
      <footer className="border-t border-line bg-white py-8 text-sm text-muted">
        <div className="app-container flex flex-col justify-between gap-2 sm:flex-row sm:gap-4">
          <span className="font-semibold text-text">QUOTE<span className="brand-gradient-text">FLOW</span></span>
          <span>견적 업로드부터 공급업체 비교까지</span>
        </div>
      </footer>
    </main>
  );
}
