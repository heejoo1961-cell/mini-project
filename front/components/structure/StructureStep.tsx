"use client";

import { useEffect } from "react";

import { StructuredQuote } from "../../lib/api/structureQuotes";
import { useQuoteWorkflow } from "../../context/QuoteWorkflowContext";
import { displayValue, formatMoney } from "../workflow/formatters";
import { WorkflowActions } from "../workflow/WorkflowActions";
import { WorkflowPageHeader } from "../workflow/WorkflowPageHeader";

const statusLabel: Record<StructuredQuote["status"], string> = {
  success: "구조화 완료",
  partial: "확인 필요",
  failed: "구조화 실패",
};

const statusStyle: Record<StructuredQuote["status"], string> = {
  success: "border border-[#33d17a]/40 bg-[#33d17a]/10 text-[#33d17a]",
  partial: "border border-[#0007cd] bg-[#0007cd]/10 text-[#0007cd]",
  failed: "border border-[#ff4d4d]/40 bg-[#ff4d4d]/10 text-[#ff4d4d]",
};

export function StructureStep() {
  const workflow = useQuoteWorkflow();
  const { runStructure, structureResults, structureStatus } = workflow;

  useEffect(() => {
    if (structureStatus === "idle" && structureResults.length === 0) {
      void runStructure();
    }
  }, [runStructure, structureResults.length, structureStatus]);

  const comparableCount = workflow.structureResults.filter((item) => item.status !== "failed").length;
  const reviewCount = workflow.structureResults.filter((item) => item.status === "partial").length;
  const itemCount = workflow.structureResults.reduce((total, quote) => total + quote.items.length, 0);

  return (
    <>
      <WorkflowPageHeader
        compact
        description="공급업체·품목·금액·거래조건을 공통 구조로 정리하고 누락값과 확인 조건을 표시합니다."
        step={3}
        title="견적 항목 구조화"
      />

      <section className="text-base">
        {structureStatus === "loading" && <div className="rounded-md border border-line bg-white px-6 py-8 text-center font-semibold text-text">견적 주요 항목을 정리하고 있습니다…</div>}

        {workflow.structureError && (
          <div className="alert-error px-5 py-4" role="alert">
            <p className="text-base font-bold">견적 항목 구조화에 실패했습니다</p>
            <p className="mt-1 text-[15px]">{workflow.structureError}</p>
            <button className="btn-primary mt-3" onClick={() => void workflow.runStructure(true)} type="button">다시 정리</button>
          </div>
        )}

        {workflow.structureResults.length > 0 && (
          <div className="mb-5 grid grid-cols-2 overflow-hidden rounded-md border border-line bg-white lg:grid-cols-4" aria-label="구조화 결과 요약">
            {[
              ["구조화 견적", `${workflow.structureResults.length}건`],
              ["비교 가능", `${comparableCount}건`],
              ["확인 필요", `${reviewCount}건`],
              ["전체 품목", `${itemCount}개`],
            ].map(([label, value], index) => (
              <div className={`min-w-0 px-6 py-5 ${index % 2 === 1 ? "border-l border-line" : ""} ${index >= 2 ? "border-t border-line lg:border-t-0" : ""} lg:border-l lg:first:border-l-0`} key={label}>
                <p className="text-sm font-semibold text-muted">{label}</p>
                <p className="mt-1.5 text-[24px] font-bold leading-8 tabular-nums text-text">{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-6">
          {workflow.structureResults.map((quote, quoteIndex) => {
            const amounts = [
              ["소계", formatMoney(quote.subtotal)],
              ["운송비", quote.shippingIncluded ? "포함 (0원)" : formatMoney(quote.shippingCost)],
              ["부가세", formatMoney(quote.vat)],
              ["최종 견적금액", formatMoney(quote.grandTotal)],
            ];
            const terms = [
              ["납기", quote.leadTime],
              ["MOQ", quote.moq],
              ["결제조건", quote.paymentTerms],
              ["견적 유효기간", quote.validity],
              ["품질조건", quote.qualityTerms],
              ["기타 조건", quote.remarks],
            ];

            return (
              <article className="overflow-hidden rounded-xl border border-line bg-surface" key={quote.savedName}>
                <header className="relative flex flex-col gap-5 border-b border-line bg-surface px-6 py-6 before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-[#0007cd] sm:flex-row sm:items-start sm:justify-between sm:px-7">
                  <div className="min-w-0">
                    <p className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1a26ff]">SUPPLIER {String(quoteIndex + 1).padStart(2, "0")}</p>
                    <h2 className="text-[26px] font-bold leading-9 text-text">{quote.supplierName ?? "공급업체명 확인 필요"}</h2>
                    <p className="mt-2 break-words text-sm leading-6 text-muted">
                      <span className="break-all">{quote.originalName}</span>
                      <span aria-hidden="true"> · </span>
                      견적번호 {displayValue(quote.quoteNumber)}
                      <span aria-hidden="true"> · </span>
                      견적일 {displayValue(quote.quoteDate)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-2.5">
                    <span className={`status-badge px-3 py-1.5 text-[13px] ${statusStyle[quote.status]}`}>{statusLabel[quote.status]}</span>
                    <span className="text-sm text-muted">{quote.parserVersion}</span>
                  </div>
                </header>

                <div className="px-6 py-6 sm:px-7 sm:py-7">
                  <section aria-labelledby={`items-${quote.savedName}`}>
                    <h3 className="text-lg font-bold text-text" id={`items-${quote.savedName}`}>품목 목록</h3>
                    <div className="mt-4 overflow-x-auto rounded-md border border-line md:overflow-x-visible">
                      <table className="w-full min-w-[760px] table-auto border-collapse text-base md:min-w-0 md:table-fixed">
                        <colgroup><col className="w-[24%]" /><col className="w-[22%]" /><col className="w-[10%]" /><col className="w-[10%]" /><col className="w-[16%]" /><col className="w-[18%]" /></colgroup>
                        <thead className="bg-[#f5f6f8] text-[#344054]">
                          <tr className="h-12">
                            <th className="px-5 text-left font-semibold" scope="col">품목</th>
                            <th className="px-5 text-left font-semibold" scope="col">규격</th>
                            <th className="px-5 text-right font-semibold" scope="col">수량</th>
                            <th className="px-5 text-center font-semibold" scope="col">단위</th>
                            <th className="px-5 text-right font-semibold" scope="col">단가</th>
                            <th className="px-5 text-right font-semibold" scope="col">금액</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line text-text">
                          {quote.items.length > 0 ? quote.items.map((item, index) => (
                            <tr className="h-14" key={`${quote.savedName}-${index}`}>
                              <td className="break-words px-5 py-4 align-middle font-semibold">{displayValue(item.itemName)}</td>
                              <td className="break-words px-5 py-4 align-middle">{displayValue(item.specification)}</td>
                              <td className="px-5 py-4 text-right align-middle tabular-nums">{displayValue(item.quantity)}</td>
                              <td className="px-5 py-4 text-center align-middle">{displayValue(item.unit)}</td>
                              <td className="px-5 py-4 text-right align-middle font-medium tabular-nums">{formatMoney(item.unitPrice)}</td>
                              <td className="px-5 py-4 text-right align-middle font-bold tabular-nums">{formatMoney(item.amount)}</td>
                            </tr>
                          )) : <tr className="h-[50px]"><td className="px-4 py-3 text-[15px] text-muted" colSpan={6}>추출된 품목이 없습니다.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section aria-label="금액 요약" className="mt-5 overflow-hidden rounded-xl border border-line bg-surface-alt">
                    <div className="grid grid-cols-2 lg:grid-cols-4">
                      {amounts.map(([label, value], index) => (
                        <div className={`relative min-w-0 border-b border-line px-6 py-5 even:border-l lg:border-b-0 lg:border-l lg:first:border-l-0 ${index === 3 ? "border-t-2 border-t-[#0007cd] bg-surface" : ""}`} key={label}>
                          <p className="text-sm font-semibold text-muted">{label}</p>
                          <p className="mt-2 break-words text-right text-[20px] font-bold leading-8 tabular-nums text-text">{value}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section aria-labelledby={`terms-${quote.savedName}`} className="mt-6 border-t border-line pt-6">
                    <h3 className="text-lg font-bold text-text" id={`terms-${quote.savedName}`}>거래조건</h3>
                    <dl className="mt-5 grid gap-x-10 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
                      {terms.map(([label, value]) => (
                        <div className="min-w-0" key={label}>
                          <dt className="text-sm font-semibold text-muted">{label}</dt>
                          <dd className="mt-1 whitespace-normal break-words text-base font-semibold leading-6 text-text">{displayValue(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>

                  {quote.missingFields.length > 0 && <div className="alert-warning mt-5 p-4"><p className="text-sm font-bold">누락 필드</p><p className="mt-1 break-words text-base">{quote.missingFields.join(", ")}</p></div>}
                  {quote.warnings.length > 0 && <div className="alert-warning mt-4 p-4"><p className="text-sm font-bold">확인 필요 경고</p><ul className="mt-2 list-disc space-y-1 pl-5 text-base">{quote.warnings.map((warning) => <li className="break-words" key={warning}>{warning}</li>)}</ul></div>}
                </div>
              </article>
            );
          })}
        </div>

        <WorkflowActions
          next={{ href: "/compare", label: "다음: 공급업체 비교" }}
          nextEnabled={comparableCount >= 2}
          previous={{ href: "/extract", label: "이전: 원문 텍스트 확인" }}
        />
      </section>
    </>
  );
}
