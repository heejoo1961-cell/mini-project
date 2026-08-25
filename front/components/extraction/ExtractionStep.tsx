"use client";

import { useEffect } from "react";

import { ExtractionResult } from "../../lib/api/extractQuotes";
import { useQuoteWorkflow } from "../../context/QuoteWorkflowContext";
import { WorkflowActions } from "../workflow/WorkflowActions";
import { WorkflowPageHeader } from "../workflow/WorkflowPageHeader";

const statusLabel: Record<ExtractionResult["status"], string> = {
  success: "텍스트 추출 완료",
  needs_ocr: "OCR 필요",
  failed: "추출 실패",
};

const statusStyle: Record<ExtractionResult["status"], string> = {
  success: "border border-[#33d17a]/40 bg-[#33d17a]/10 text-[#33d17a]",
  needs_ocr: "border border-[#d6a84b]/40 bg-[#d6a84b]/10 text-[#d6a84b]",
  failed: "border border-[#ff4d4d]/40 bg-[#ff4d4d]/10 text-[#ff4d4d]",
};

export function ExtractionStep() {
  const workflow = useQuoteWorkflow();
  const { extractionResults, extractionStatus, runExtraction } = workflow;

  useEffect(() => {
    if (extractionStatus === "idle" && extractionResults.length === 0) {
      void runExtraction();
    }
  }, [extractionResults.length, extractionStatus, runExtraction]);

  const successfulCount = workflow.extractionResults.filter((item) => item.status === "success").length;
  const ocrCount = workflow.extractionResults.filter((item) => item.status === "needs_ocr").length;
  const failedCount = workflow.extractionResults.filter((item) => item.status === "failed").length;

  return (
    <>
      <WorkflowPageHeader
        compact
        description="업로드된 PDF의 페이지별 원문을 확인합니다. 스캔 문서와 추출 실패 파일은 이 단계에서 구분됩니다."
        step={2}
        title="원문 텍스트 추출"
      />
      <section>
        <div className="grid grid-cols-2 overflow-hidden rounded-md border border-line bg-white lg:grid-cols-4" aria-label="텍스트 추출 결과 요약">
          {[["업로드 파일", `${workflow.uploadedFiles.length}개`], ["추출 완료", `${successfulCount}개`], ["OCR 필요", `${ocrCount}개`], ["추출 실패", `${failedCount}개`]].map(([label, value], index) => (
            <div className={`min-w-0 px-5 py-4 ${index % 2 === 1 ? "border-l border-line" : ""} ${index >= 2 ? "border-t border-line lg:border-t-0" : ""} lg:border-l lg:first:border-l-0`} key={label}>
              <p className="text-sm font-semibold text-muted">{label}</p>
              <p className="mt-1 text-[22px] font-bold leading-7 tabular-nums text-text">{value}</p>
            </div>
          ))}
        </div>
        {workflow.extractionStatus === "loading" && <p className="mt-3 text-right text-sm font-bold text-accent">텍스트 추출 중…</p>}

        {workflow.extractionError && (
          <div className="alert-error mt-5 px-5 py-4" role="alert">
            <p className="font-bold text-[#b42318]">텍스트 추출에 실패했습니다</p>
            <p className="mt-1 text-sm text-[#7a332c]">{workflow.extractionError}</p>
            <button className="btn-primary mt-3 min-h-10 px-5 py-2 text-sm" onClick={() => void workflow.runExtraction(true)} type="button">다시 추출</button>
          </div>
        )}

        {workflow.extractionStatus === "loading" && workflow.extractionResults.length === 0 && (
          <div className="mt-4 rounded-lg border border-line bg-canvas p-5 text-sm text-text" role="status">PDF 페이지를 읽고 있습니다.</div>
        )}

        {workflow.extractionResults.length > 0 && (
          <div className="mt-5 space-y-4">
            {workflow.extractionResults.map((item, index) => (
              <details className="group relative overflow-hidden rounded-xl border border-line bg-surface before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-[#0007cd] open:bg-surface-alt" key={item.savedName}>
                <summary className="flex min-h-[76px] cursor-pointer list-none flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div>
                    <p className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1a26ff]">DOCUMENT {String(index + 1).padStart(2, "0")}</p>
                    <p className="break-all text-lg font-bold text-text">{item.originalName}</p>
                    <p className="mt-1 text-[13px] text-muted">{item.pageCount}페이지 · {item.characterCount.toLocaleString("ko-KR")}자</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`status-badge ${statusStyle[item.status]}`}>{statusLabel[item.status]}</span>
                    <span className="text-sm font-bold text-accent group-open:hidden">펼치기</span>
                    <span className="hidden text-sm font-bold text-accent group-open:inline">접기</span>
                  </div>
                </summary>
                <div className="border-t border-[#d0d6e1] p-5 sm:p-6">
                  {item.status === "success" ? (
                    <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-line bg-black p-5 font-mono text-[13px] leading-6 text-[#a8a8a8]">{item.extractedText}</pre>
                  ) : (
                    <div className="rounded-lg bg-[#f5f6fb] p-4">
                      <p className="text-sm leading-6 text-[#3e4149]">{item.errorMessage ?? "PDF 텍스트를 확인할 수 없습니다."}</p>
                      {item.status === "failed" && <button className="btn-primary mt-3 min-h-10 px-4 py-2 text-sm" onClick={() => void workflow.runExtraction(true)} type="button">다시 추출</button>}
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}

        <WorkflowActions
          next={{ href: "/structure", label: "다음: 견적 항목 정리" }}
          nextEnabled={successfulCount > 0}
          previous={{ href: "/upload", label: "이전: 견적서 업로드" }}
        />
      </section>
    </>
  );
}
