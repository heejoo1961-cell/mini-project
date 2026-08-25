"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CompareQuotesError,
  CompareQuotesSuccess,
  compareQuotes,
  isCompareQuotesSuccess,
} from "../lib/api/compareQuotes";
import {
  ExtractQuotesError,
  ExtractionResult,
  extractQuotes,
  isExtractQuotesSuccess,
} from "../lib/api/extractQuotes";
import {
  StructuredQuote,
  StructureQuotesError,
  isStructureQuotesSuccess,
  structureQuotes,
} from "../lib/api/structureQuotes";
import {
  UploadedPdf,
  UploadQuoteError,
  isUploadQuotesSuccess,
  uploadQuotes,
} from "../lib/api/uploadQuote";

const STORAGE_KEY = "quote-workflow";
const SCHEMA_VERSION = 1;

export type WorkflowStepStatus = "idle" | "loading" | "success" | "error";
export type WorkflowStep = "upload" | "extract" | "structure" | "compare";

type StoredWorkflow = {
  version: 1;
  uploadedFiles: UploadedPdf[];
  extractionResults: ExtractionResult[];
  structureResults: StructuredQuote[];
  comparisonResult: CompareQuotesSuccess | null;
  uploadStatus: WorkflowStepStatus;
  extractionStatus: WorkflowStepStatus;
  structureStatus: WorkflowStepStatus;
  comparisonStatus: WorkflowStepStatus;
  uploadError: string;
  extractionError: string;
  structureError: string;
  comparisonError: string;
};

type QuoteWorkflowContextValue = Omit<StoredWorkflow, "version"> & {
  hydrated: boolean;
  notice: string;
  setNotice: (message: string) => void;
  access: Record<WorkflowStep, boolean>;
  uploadFiles: (files: File[]) => Promise<boolean>;
  runExtraction: (force?: boolean) => Promise<boolean>;
  runStructure: (force?: boolean) => Promise<boolean>;
  runComparison: (force?: boolean) => Promise<boolean>;
  resetWorkflow: () => void;
};

const QuoteWorkflowContext = createContext<QuoteWorkflowContextValue | null>(null);

let extractionRequest: ReturnType<typeof extractQuotes> | null = null;
let structureRequest: ReturnType<typeof structureQuotes> | null = null;
let comparisonRequest: ReturnType<typeof compareQuotes> | null = null;

function isStatus(value: unknown): value is WorkflowStepStatus {
  return ["idle", "loading", "success", "error"].includes(String(value));
}

function restoredStatus(value: WorkflowStepStatus): WorkflowStepStatus {
  return value === "loading" ? "idle" : value;
}

function parseStoredWorkflow(raw: string): StoredWorkflow | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const item = value as Record<string, unknown>;
    if (item.version !== SCHEMA_VERSION) return null;

    const uploadPayload = { message: "stored", uploadedFiles: item.uploadedFiles };
    const extractionPayload = { message: "stored", results: item.extractionResults };
    const structurePayload = { message: "stored", results: item.structureResults };
    const statuses = [
      item.uploadStatus,
      item.extractionStatus,
      item.structureStatus,
      item.comparisonStatus,
    ];
    const errors = [
      item.uploadError,
      item.extractionError,
      item.structureError,
      item.comparisonError,
    ];

    if (
      !isUploadQuotesSuccess(uploadPayload) ||
      !isExtractQuotesSuccess(extractionPayload) ||
      !isStructureQuotesSuccess(structurePayload) ||
      !(item.comparisonResult === null || isCompareQuotesSuccess(item.comparisonResult)) ||
      !statuses.every(isStatus) ||
      !errors.every((error) => typeof error === "string")
    ) {
      return null;
    }

    return {
      version: 1,
      uploadedFiles: uploadPayload.uploadedFiles,
      extractionResults: extractionPayload.results,
      structureResults: structurePayload.results,
      comparisonResult: item.comparisonResult as CompareQuotesSuccess | null,
      uploadStatus: restoredStatus(item.uploadStatus as WorkflowStepStatus),
      extractionStatus: restoredStatus(item.extractionStatus as WorkflowStepStatus),
      structureStatus: restoredStatus(item.structureStatus as WorkflowStepStatus),
      comparisonStatus: restoredStatus(item.comparisonStatus as WorkflowStepStatus),
      uploadError: item.uploadError as string,
      extractionError: item.extractionError as string,
      structureError: item.structureError as string,
      comparisonError: item.comparisonError as string,
    };
  } catch {
    return null;
  }
}

export function QuoteWorkflowProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedPdf[]>([]);
  const [extractionResults, setExtractionResults] = useState<ExtractionResult[]>([]);
  const [structureResults, setStructureResults] = useState<StructuredQuote[]>([]);
  const [comparisonResult, setComparisonResult] = useState<CompareQuotesSuccess | null>(null);
  const [uploadStatus, setUploadStatus] = useState<WorkflowStepStatus>("idle");
  const [extractionStatus, setExtractionStatus] = useState<WorkflowStepStatus>("idle");
  const [structureStatus, setStructureStatus] = useState<WorkflowStepStatus>("idle");
  const [comparisonStatus, setComparisonStatus] = useState<WorkflowStepStatus>("idle");
  const [uploadError, setUploadError] = useState("");
  const [extractionError, setExtractionError] = useState("");
  const [structureError, setStructureError] = useState("");
  const [comparisonError, setComparisonError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const stored = raw ? parseStoredWorkflow(raw) : null;
    if (raw && !stored) window.sessionStorage.removeItem(STORAGE_KEY);
    if (stored) {
      setUploadedFiles(stored.uploadedFiles);
      setExtractionResults(stored.extractionResults);
      setStructureResults(stored.structureResults);
      setComparisonResult(stored.comparisonResult);
      setUploadStatus(stored.uploadedFiles.length > 0 ? "success" : stored.uploadStatus);
      setExtractionStatus(stored.extractionResults.length > 0 ? "success" : stored.extractionStatus);
      setStructureStatus(stored.structureResults.length > 0 ? "success" : stored.structureStatus);
      setComparisonStatus(stored.comparisonResult ? "success" : stored.comparisonStatus);
      setUploadError(stored.uploadError);
      setExtractionError(stored.extractionError);
      setStructureError(stored.structureError);
      setComparisonError(stored.comparisonError);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const stored: StoredWorkflow = {
      version: 1,
      uploadedFiles,
      extractionResults,
      structureResults,
      comparisonResult,
      uploadStatus,
      extractionStatus,
      structureStatus,
      comparisonStatus,
      uploadError,
      extractionError,
      structureError,
      comparisonError,
    };
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // 브라우저 저장 용량이 부족해도 현재 메모리의 작업 흐름은 유지한다.
    }
  }, [
    hydrated,
    uploadedFiles,
    extractionResults,
    structureResults,
    comparisonResult,
    uploadStatus,
    extractionStatus,
    structureStatus,
    comparisonStatus,
    uploadError,
    extractionError,
    structureError,
    comparisonError,
  ]);

  const clearDownstreamFromUpload = useCallback(() => {
    setExtractionResults([]);
    setStructureResults([]);
    setComparisonResult(null);
    setExtractionStatus("idle");
    setStructureStatus("idle");
    setComparisonStatus("idle");
    setExtractionError("");
    setStructureError("");
    setComparisonError("");
  }, []);

  const uploadFiles = useCallback(async (files: File[]) => {
    setUploadStatus("loading");
    setUploadError("");
    try {
      const response = await uploadQuotes(files);
      setUploadedFiles(response.uploadedFiles);
      clearDownstreamFromUpload();
      setUploadStatus("success");
      return true;
    } catch (reason) {
      setUploadStatus("error");
      setUploadError(
        reason instanceof UploadQuoteError
          ? reason.message
          : "파일 업로드 중 오류가 발생했습니다.",
      );
      return false;
    }
  }, [clearDownstreamFromUpload]);

  const runExtraction = useCallback(async (force = false) => {
    if (!uploadedFiles.length) return false;
    if (!force && extractionResults.length > 0) return true;
    setExtractionStatus("loading");
    setExtractionError("");
    try {
      if (!extractionRequest) extractionRequest = extractQuotes(uploadedFiles);
      const response = await extractionRequest;
      setExtractionResults(response.results);
      setStructureResults([]);
      setComparisonResult(null);
      setStructureStatus("idle");
      setComparisonStatus("idle");
      setStructureError("");
      setComparisonError("");
      setExtractionStatus("success");
      return true;
    } catch (reason) {
      setExtractionStatus("error");
      setExtractionError(
        reason instanceof ExtractQuotesError
          ? reason.message
          : "PDF 텍스트 추출 중 오류가 발생했습니다.",
      );
      return false;
    } finally {
      extractionRequest = null;
    }
  }, [extractionResults.length, uploadedFiles]);

  const runStructure = useCallback(async (force = false) => {
    if (!force && structureResults.length > 0) return true;
    const successfulNames = new Set(
      extractionResults
        .filter((item) => item.status === "success")
        .map((item) => item.savedName),
    );
    const targets = uploadedFiles.filter((item) => successfulNames.has(item.savedName));
    if (!targets.length) return false;

    setStructureStatus("loading");
    setStructureError("");
    try {
      if (!structureRequest) structureRequest = structureQuotes(targets);
      const response = await structureRequest;
      setStructureResults(response.results);
      setComparisonResult(null);
      setComparisonStatus("idle");
      setComparisonError("");
      setStructureStatus("success");
      return true;
    } catch (reason) {
      setStructureStatus("error");
      setStructureError(
        reason instanceof StructureQuotesError
          ? reason.message
          : "견적 주요 항목을 정리하는 중 오류가 발생했습니다.",
      );
      return false;
    } finally {
      structureRequest = null;
    }
  }, [extractionResults, structureResults.length, uploadedFiles]);

  const runComparison = useCallback(async (force = false) => {
    if (!force && comparisonResult) return true;
    const usableNames = new Set(
      structureResults
        .filter((item) => item.status !== "failed")
        .map((item) => item.savedName),
    );
    const targets = uploadedFiles.filter((item) => usableNames.has(item.savedName));
    if (targets.length < 2) return false;

    setComparisonStatus("loading");
    setComparisonError("");
    try {
      if (!comparisonRequest) comparisonRequest = compareQuotes(targets);
      setComparisonResult(await comparisonRequest);
      setComparisonStatus("success");
      return true;
    } catch (reason) {
      setComparisonStatus("error");
      setComparisonError(
        reason instanceof CompareQuotesError
          ? reason.message
          : "공급업체 견적을 비교하는 중 오류가 발생했습니다.",
      );
      return false;
    } finally {
      comparisonRequest = null;
    }
  }, [comparisonResult, structureResults, uploadedFiles]);

  const resetWorkflow = useCallback(() => {
    extractionRequest = null;
    structureRequest = null;
    comparisonRequest = null;
    window.sessionStorage.removeItem(STORAGE_KEY);
    setUploadedFiles([]);
    setExtractionResults([]);
    setStructureResults([]);
    setComparisonResult(null);
    setUploadStatus("idle");
    setExtractionStatus("idle");
    setStructureStatus("idle");
    setComparisonStatus("idle");
    setUploadError("");
    setExtractionError("");
    setStructureError("");
    setComparisonError("");
    setNotice("");
  }, []);

  const access = useMemo<Record<WorkflowStep, boolean>>(
    () => ({
      upload: true,
      extract: uploadedFiles.length > 0,
      structure: extractionResults.some((item) => item.status === "success"),
      compare: structureResults.filter((item) => item.status !== "failed").length >= 2,
    }),
    [extractionResults, structureResults, uploadedFiles.length],
  );

  const value = useMemo<QuoteWorkflowContextValue>(
    () => ({
      hydrated,
      uploadedFiles,
      extractionResults,
      structureResults,
      comparisonResult,
      uploadStatus,
      extractionStatus,
      structureStatus,
      comparisonStatus,
      uploadError,
      extractionError,
      structureError,
      comparisonError,
      notice,
      setNotice,
      access,
      uploadFiles,
      runExtraction,
      runStructure,
      runComparison,
      resetWorkflow,
    }),
    [
      hydrated,
      uploadedFiles,
      extractionResults,
      structureResults,
      comparisonResult,
      uploadStatus,
      extractionStatus,
      structureStatus,
      comparisonStatus,
      uploadError,
      extractionError,
      structureError,
      comparisonError,
      notice,
      access,
      uploadFiles,
      runExtraction,
      runStructure,
      runComparison,
      resetWorkflow,
    ],
  );

  return <QuoteWorkflowContext.Provider value={value}>{children}</QuoteWorkflowContext.Provider>;
}

export function useQuoteWorkflow(): QuoteWorkflowContextValue {
  const value = useContext(QuoteWorkflowContext);
  if (!value) throw new Error("QuoteWorkflowProvider 안에서 사용해야 합니다.");
  return value;
}
