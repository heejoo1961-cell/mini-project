"use client";

import { ChangeEvent, useRef, useState } from "react";

import {
  UploadQuoteError,
  UploadSuccess,
  uploadQuote,
} from "../lib/api/uploadQuote";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set(["xlsx", "csv"]);

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadSuccess | null>(null);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setResult(null);
    setError("");

    if (!selected) {
      setFile(null);
      return;
    }

    const extension = selected.name.split(".").pop()?.toLowerCase() ?? "";
    if (!SUPPORTED_EXTENSIONS.has(extension)) {
      setFile(null);
      setError("XLSX 또는 CSV 파일만 선택할 수 있습니다.");
      event.target.value = "";
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setFile(null);
      setError("파일 크기는 10MB 이하여야 합니다.");
      event.target.value = "";
      return;
    }
    setFile(selected);
  }

  async function handleUpload() {
    if (!file) {
      setError("견적서 파일을 선택해 주세요.");
      return;
    }

    setIsUploading(true);
    setResult(null);
    setError("");
    try {
      setResult(await uploadQuote(file));
    } catch (reason) {
      setError(
        reason instanceof UploadQuoteError
          ? reason.message
          : "파일 업로드 중 오류가 발생했습니다.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  function resetUpload() {
    setFile(null);
    setResult(null);
    setError("");
    setIsUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white shadow-sm">Q</span>
            <div>
              <p className="font-bold tracking-tight text-slate-950">AI 견적 비교</p>
              <p className="text-[11px] font-medium text-slate-500">PURCHASE DECISION SUPPORT</p>
            </div>
          </div>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">파일 등록 · Beta</span>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-20">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            구매 실무자를 위한 견적 검토
          </div>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-[-0.035em] text-slate-950 sm:text-5xl">
            흩어진 견적서,
            <br />
            <span className="text-blue-700">비교 가능한 데이터</span>로
            <br />
            시작하세요.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600">
            공급업체에서 받은 XLSX·CSV 견적서를 등록하세요. 먼저 파일 형식과 크기를 안전하게 확인하고, 이후 견적 비교 업무를 위한 준비를 시작합니다.
          </p>

          <dl className="mt-8 grid max-w-xl grid-cols-3 divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white py-4 shadow-sm">
            <div className="px-4">
              <dt className="text-xs text-slate-500">파일 보관</dt>
              <dd className="mt-1 text-sm font-bold text-slate-900">저장하지 않음</dd>
            </div>
            <div className="px-4">
              <dt className="text-xs text-slate-500">지원 형식</dt>
              <dd className="mt-1 text-sm font-bold text-slate-900">XLSX · CSV</dd>
            </div>
            <div className="px-4">
              <dt className="text-xs text-slate-500">최대 용량</dt>
              <dd className="mt-1 text-sm font-bold text-slate-900">10MB</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)] sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Step 01</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">견적서 등록</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">검토할 공급업체 견적서 한 개를 선택해 주세요.</p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4 4 4M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4" />
              </svg>
            </span>
          </div>

          <label className="group mt-7 block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/80 p-7 text-center transition hover:border-blue-500 hover:bg-blue-50/40">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition group-hover:text-blue-700 group-hover:ring-blue-200">
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 001-9.9A7 7 0 105.3 6.4 4.5 4.5 0 003 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v6m0-6-2.5 2.5M12 12l2.5 2.5" />
              </svg>
            </span>
            <span className="mt-4 block font-semibold text-slate-900">파일을 선택해 주세요</span>
            <span className="mt-1 block text-sm text-slate-500">XLSX, CSV · 최대 10MB</span>
          <input
            ref={inputRef}
            className="mt-5 block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2.5 file:font-semibold file:text-white hover:file:bg-blue-700 disabled:opacity-60"
            type="file"
            accept=".xlsx,.csv"
            disabled={isUploading}
            onChange={handleFileChange}
          />
        </label>

        {file && (
          <div className="mt-5 flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4" aria-live="polite">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-700">{file.name.split(".").pop()?.toUpperCase()}</span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{file.name}</p>
              <p className="mt-0.5 text-sm text-slate-500">{formatFileSize(file.size)} · 업로드 준비 완료</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800" role="alert">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950" aria-live="polite">
            <p className="font-bold">파일 검증이 완료되었습니다</p>
            <p className="mt-1 text-sm leading-6">{result.message}</p>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="font-semibold">파일명</dt><dd className="break-all">{result.fileName}</dd>
              <dt className="font-semibold">파일 형식</dt><dd>{result.fileType.toUpperCase()}</dd>
              <dt className="font-semibold">파일 크기</dt><dd>{formatFileSize(result.fileSize)} ({result.fileSize.toLocaleString("ko-KR")} bytes)</dd>
              <dt className="font-semibold">처리 상태</dt><dd>정상 접수</dd>
            </dl>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            type="button"
            disabled={!file || isUploading}
            onClick={handleUpload}
          >
            {isUploading ? "업로드 중…" : "견적서 업로드"}
          </button>
          <button
            className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={isUploading || (!file && !result && !error)}
            onClick={resetUpload}
          >
            초기화
          </button>
        </div>
        </section>
      </div>
    </main>
  );
}
