"use client";

import Link from "next/link";
import { ChangeEvent, DragEvent, useRef, useState } from "react";

import { useQuoteWorkflow } from "../../context/QuoteWorkflowContext";
import { formatFileSize } from "../workflow/formatters";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;
const SUPPORTED_EXTENSIONS = new Set(["pdf", "xlsx", "csv"]);

function fileExtension(file: File): string {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export function UploadStep() {
  const inputRef = useRef<HTMLInputElement>(null);
  const workflow = useQuoteWorkflow();
  const [files, setFiles] = useState<File[]>([]);
  const [localError, setLocalError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const busy = workflow.uploadStatus === "loading";

  function addFiles(incoming: File[]) {
    setLocalError("");
    const unique = incoming.filter(
      (candidate) => !files.some((current) => fileKey(current) === fileKey(candidate)),
    );
    if (files.length + unique.length > MAX_FILES) {
      setLocalError("PDF 견적서는 최대 5개까지 선택할 수 있습니다.");
      return;
    }
    const invalid = unique.find((file) => !SUPPORTED_EXTENSIONS.has(fileExtension(file)));
    if (invalid) {
      setLocalError(`${invalid.name}: PDF, XLSX 또는 CSV 파일만 선택할 수 있습니다.`);
      return;
    }
    const oversized = unique.find((file) => file.size > MAX_FILE_SIZE);
    if (oversized) {
      setLocalError(`${oversized.name}: 파일 크기는 각각 10MB 이하여야 합니다.`);
      return;
    }
    setFiles((current) => [...current, ...unique]);
  }

  async function handleUpload() {
    if (!files.length) {
      setLocalError("견적서 파일을 한 개 이상 선택해 주세요.");
      return;
    }
    if (
      workflow.uploadedFiles.length > 0 &&
      !window.confirm("새 견적서를 업로드하면 기존 분석 결과가 초기화됩니다. 계속할까요?")
    ) {
      return;
    }
    const succeeded = await workflow.uploadFiles(files);
    if (succeeded) {
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (!busy) addFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <section className="relative left-1/2 min-h-[calc(100vh-64px)] w-screen -translate-x-1/2 overflow-hidden bg-white text-[#111318]">
      <div aria-hidden="true" className="pointer-events-none absolute left-[56%] top-24 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[#1a26ff]/10 blur-[120px]" />
      <div className="relative mx-auto grid max-w-[1200px] gap-12 px-6 py-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:py-24">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#222222] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
            <span className="h-2 w-2 rounded-full bg-[#33d17a]" />
            Purchase data intake
          </div>
          <h1 className="mt-8 text-[42px] font-medium leading-[1.08] tracking-[-1.3px] text-[#111318] sm:text-[56px]">
            견적서를
            <br />
            <span className="text-[#1a26ff]">비교 가능한 데이터</span>로
            <br />
            전환하세요.
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-[#667085]">
            PDF·XLSX·CSV 견적서를 등록하면 원문을 읽고, 공급업체별 조건을 같은 기준으로 정리할 준비를 시작합니다.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-[#0007cd] px-[18px] text-sm font-medium text-white hover:bg-[#0005a3]">
              견적서 선택
              <input ref={inputRef} accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,text/csv,.csv" className="sr-only" disabled={busy} multiple onChange={handleFileChange} type="file" />
            </label>
            <span className="inline-flex h-10 items-center rounded-lg border border-[#c7cdd4] bg-white px-4 text-sm text-[#667085]">최대 5개 · 파일당 10MB</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#333333] bg-black p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between border-b border-[#222222] pb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#333333]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#333333]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#0007cd]" />
            </div>
            <span className="font-mono text-xs text-[#666666]">quote-intake / ready</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              ["01 / FORMAT", "PDF · XLSX · CSV"],
              ["02 / LIMIT", "5 files · 10MB"],
              ["03 / STORAGE", "Local workspace"],
              ["04 / NEXT", "Text extraction"],
            ].map(([label, value]) => (
              <div className="rounded-xl bg-[#181818] p-4" key={label}>
                <p className="font-mono text-[11px] font-semibold tracking-[0.08em] text-[#666666]">{label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div
            className={`mt-3 rounded-xl border border-dashed p-7 text-center transition ${isDragging ? "border-[#1a26ff] bg-[#0007cd]/15" : "border-[#333333] bg-[#181818] hover:border-[#0007cd]"}`}
            onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
            onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <span aria-hidden="true" className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-[#222222] text-lg font-medium text-white">↑</span>
            <p className="mt-4 text-base font-semibold text-white">파일을 놓거나 직접 선택하세요</p>
            <p className="mt-1 text-sm text-[#888888]">지원하지 않는 형식은 업로드 전에 차단됩니다.</p>
            <label className="mt-5 inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-[#222222] px-[18px] text-sm font-medium text-white hover:bg-[#2a2a2a]">
              파일 찾아보기
              <input ref={inputRef} accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,text/csv,.csv" className="sr-only" disabled={busy} multiple onChange={handleFileChange} type="file" />
            </label>
          </div>

        {files.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-[#333333] bg-[#181818]">
            <div className="flex items-center justify-between">
              <h2 className="px-5 py-4 text-base font-semibold text-white">선택한 파일</h2>
              <span className="px-5 py-4 text-sm text-[#888888]">{files.length} / {MAX_FILES}개</span>
            </div>
            <div className="hidden h-10 grid-cols-[minmax(0,1fr)_6rem_6rem_3rem] items-center gap-4 border-y border-[#333333] bg-black px-5 font-mono text-xs text-[#666666] sm:grid"><span>FILE</span><span className="text-right">SIZE</span><span>STATUS</span><span /></div>
            <ul className="divide-y divide-[#2a2a2a]">
              {files.map((file) => (
                <li className="grid min-h-[52px] gap-2 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_6rem_6rem_3rem] sm:items-center sm:gap-4" key={fileKey(file)}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{file.name}</p>
                  </div>
                  <p className="text-sm text-[#888888] sm:text-right">{formatFileSize(file.size)}</p>
                  <span className="text-sm text-[#a8a8a8]">대기</span>
                  <button className="text-left text-sm text-[#888888] hover:text-white sm:text-right" disabled={busy} onClick={() => setFiles((current) => current.filter((item) => fileKey(item) !== fileKey(file)))} type="button">삭제</button>
                </li>
              ))}
            </ul>
            {workflow.uploadedFiles.length > 0 && (
              <p className="border-t border-[#333333] px-5 py-3 text-sm text-[#a8a8a8]">새 견적서를 업로드하면 기존 분석 결과가 초기화됩니다.</p>
            )}
          </div>
        )}

        {(localError || workflow.uploadError) && (
          <div className="mt-4 rounded-lg border border-[#ff4d4d]/50 bg-[#ff4d4d]/10 px-5 py-4" role="alert">
            <p className="font-semibold text-[#ff6b6b]">업로드 항목을 확인해 주세요</p>
            <p className="mt-1 text-sm text-[#d8a0a0]">{localError || workflow.uploadError}</p>
          </div>
        )}

        {workflow.uploadedFiles.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-[#333333] bg-[#181818]">
            <h2 className="border-b border-[#333333] px-5 py-4 text-base font-semibold text-white">업로드 완료 파일</h2>
            <ul className="divide-y divide-[#2a2a2a]">
              {workflow.uploadedFiles.map((file) => (
                <li className="flex min-h-[52px] items-center justify-between gap-4 px-5 py-3" key={file.savedName}>
                  <span className="break-all text-sm font-medium text-white">{file.originalName}</span>
                  <span className="shrink-0 text-sm text-[#888888]">{formatFileSize(file.size)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button className="h-10 rounded-lg bg-[#0007cd] px-[18px] text-sm font-medium text-white hover:bg-[#0005a3] disabled:cursor-not-allowed disabled:bg-[#222222] disabled:text-[#666666]" disabled={!files.length || busy} onClick={() => void handleUpload()} type="button">
            {busy ? "업로드 중…" : `${files.length}개 견적서 업로드`}
          </button>
          {workflow.uploadedFiles.length > 0 ? (
            <Link className="inline-flex h-10 items-center justify-center rounded-lg border border-[#333333] px-[18px] text-sm font-medium text-white hover:bg-[#222222]" href="/extract">다음: 원문 텍스트 확인</Link>
          ) : (
            <button className="h-10 rounded-lg border border-[#222222] px-[18px] text-sm font-medium text-[#666666]" disabled type="button">다음: 원문 텍스트 확인</button>
          )}
        </div>
        </div>
      </div>
    </section>
  );
}
