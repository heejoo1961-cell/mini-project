export type UploadSuccess = {
  fileName: string;
  fileType: "xlsx" | "csv";
  fileSize: number;
  status: "success";
  message: string;
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

function isSuccessResponse(value: unknown): value is UploadSuccess {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.status === "success" &&
    typeof candidate.fileName === "string" &&
    (candidate.fileType === "xlsx" || candidate.fileType === "csv") &&
    typeof candidate.fileSize === "number" &&
    typeof candidate.message === "string"
  );
}

export async function uploadQuote(file: File): Promise<UploadSuccess> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new UploadQuoteError(
      "Backend 주소가 설정되지 않았습니다.",
      "API_URL_NOT_CONFIGURED",
    );
  }

  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/api/quote-files/upload`,
      { method: "POST", body: formData },
    );
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

  if (!isSuccessResponse(body)) {
    throw new UploadQuoteError(
      "업로드 응답을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      "INVALID_SUCCESS_RESPONSE",
    );
  }
  return body;
}
