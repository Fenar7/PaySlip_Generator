export type PdfStudioConversionFailureCode =
  | "feature_not_available"
  | "rate_limited"
  | "too_many_active_jobs"
  | "unsupported_input"
  | "file_too_large"
  | "page_limit_exceeded"
  | "password_protected"
  | "malformed_pdf"
  | "malformed_docx"
  | "html_remote_disabled"
  | "html_asset_blocked"
  | "html_render_timeout"
  | "storage_error"
  | "conversion_failed";

export class PdfStudioConversionError extends Error {
  readonly code: PdfStudioConversionFailureCode;
  readonly status: number;
  readonly retryable: boolean;

  constructor(params: {
    code: PdfStudioConversionFailureCode;
    message: string;
    status?: number;
    retryable?: boolean;
  }) {
    super(params.message);
    this.name = "PdfStudioConversionError";
    this.code = params.code;
    this.status = params.status ?? 400;
    this.retryable = params.retryable ?? false;
  }
}

export function isPdfStudioConversionError(
  error: unknown,
): error is PdfStudioConversionError {
  return error instanceof PdfStudioConversionError;
}

export function toPdfStudioConversionError(error: unknown) {
  if (isPdfStudioConversionError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new PdfStudioConversionError({
      code: "conversion_failed",
      message: error.message,
      status: 500,
      retryable: true,
    });
  }

  return new PdfStudioConversionError({
    code: "conversion_failed",
    message: "Conversion failed. Try again with a supported file.",
    status: 500,
    retryable: true,
  });
}
