export type UploadedQuoteFile = {
  originalName: string;
  savedName: string;
  size: number;
  contentType: string;
};

export type UploadedPdf = UploadedQuoteFile;

export type UploadQuotesSuccess = {
  message: string;
  uploadedFiles: UploadedPdf[];
};

type UploadErrorResponse = {
  status: "error";
  code: string;
  message: string;
};

export class UploadQuoteError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "UploadQuoteError";
  }
}

function isErrorResponse(value: unknown): value is UploadErrorResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.status === "error" &&
    typeof candidate.code === "string" &&
    typeof candidate.message === "string"
  );
}

function isUploadedPdf(value: unknown): value is UploadedPdf {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.originalName === "string" &&
    typeof candidate.savedName === "string" &&
    typeof candidate.size === "number" &&
    typeof candidate.contentType === "string"
  );
}

export function isUploadQuotesSuccess(value: unknown): value is UploadQuotesSuccess {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.message === "string" &&
    Array.isArray(candidate.uploadedFiles) &&
    candidate.uploadedFiles.every(isUploadedPdf)
  );
}

export async function uploadQuotes(files: File[]): Promise<UploadQuotesSuccess> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new UploadQuoteError(
      "Backend 주소가 설정되지 않았습니다.",
      "API_URL_NOT_CONFIGURED",
    );
  }

  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/quotes/upload`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new UploadQuoteError(
      "Backend에 연결할 수 없습니다. 서버 실행 상태를 확인해 주세요.",
      "CONNECTION_FAILED",
    );
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (isErrorResponse(body)) {
      throw new UploadQuoteError(body.message, body.code);
    }
    throw new UploadQuoteError(
      "파일 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      "INVALID_ERROR_RESPONSE",
    );
  }

  if (!isUploadQuotesSuccess(body)) {
    throw new UploadQuoteError(
      "업로드 응답을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      "INVALID_SUCCESS_RESPONSE",
    );
  }
  return body;
}
