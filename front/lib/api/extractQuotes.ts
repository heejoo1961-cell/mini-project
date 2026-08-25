import type { UploadedPdf } from "./uploadQuote";

export type ExtractionStatus = "success" | "needs_ocr" | "failed";

export type ExtractionResult = {
  originalName: string;
  savedName: string;
  status: ExtractionStatus;
  pageCount: number;
  characterCount: number;
  extractedText: string;
  errorMessage: string | null;
};

export type ExtractQuotesSuccess = {
  message: string;
  results: ExtractionResult[];
};

type ErrorResponse = {
  status: "error";
  code: string;
  message: string;
};

export class ExtractQuotesError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ExtractQuotesError";
  }
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.status === "error" &&
    typeof candidate.code === "string" &&
    typeof candidate.message === "string"
  );
}

function isExtractionResult(value: unknown): value is ExtractionResult {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.originalName === "string" &&
    typeof candidate.savedName === "string" &&
    ["success", "needs_ocr", "failed"].includes(String(candidate.status)) &&
    typeof candidate.pageCount === "number" &&
    typeof candidate.characterCount === "number" &&
    typeof candidate.extractedText === "string" &&
    (candidate.errorMessage === null ||
      typeof candidate.errorMessage === "string")
  );
}

export function isExtractQuotesSuccess(value: unknown): value is ExtractQuotesSuccess {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.message === "string" &&
    Array.isArray(candidate.results) &&
    candidate.results.every(isExtractionResult)
  );
}

export async function extractQuotes(
  files: Pick<UploadedPdf, "originalName" | "savedName">[],
): Promise<ExtractQuotesSuccess> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new ExtractQuotesError(
      "Backend 주소가 설정되지 않았습니다.",
      "API_URL_NOT_CONFIGURED",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/quotes/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    });
  } catch {
    throw new ExtractQuotesError(
      "Backend에 연결할 수 없습니다. 업로드된 파일은 저장되어 있으므로 서버 상태를 확인한 뒤 다시 추출해 주세요.",
      "CONNECTION_FAILED",
    );
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (isErrorResponse(body)) {
      throw new ExtractQuotesError(body.message, body.code);
    }
    throw new ExtractQuotesError(
      "텍스트 추출 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      "INVALID_ERROR_RESPONSE",
    );
  }

  if (!isExtractQuotesSuccess(body)) {
    throw new ExtractQuotesError(
      "텍스트 추출 응답 형식을 확인할 수 없습니다.",
      "INVALID_SUCCESS_RESPONSE",
    );
  }
  return body;
}
