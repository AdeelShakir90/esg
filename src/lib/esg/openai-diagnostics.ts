import OpenAI from "openai";

const MAX_DIAGNOSTIC_MESSAGE_LENGTH = 240;

export type SafeOpenAiErrorDiagnostic = {
  errorClass: string;
  errorName: string;
  httpStatus: number | null;
  providerErrorType: string | null;
  providerErrorCode: string | null;
  requestId: string | null;
  providerMessage: string;
  model: string;
};

function safeMetadata(value: unknown) {
  if (typeof value !== "string") return null;
  const sanitized = value.replace(/[^a-zA-Z0-9._:-]/g, "").slice(0, 100);
  return sanitized || null;
}

export function sanitizeOpenAiErrorMessage(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "No provider error message was available.";
  }

  if (/document_text|authorization|instructions|input["':\s]/i.test(value)) {
    return "Provider message was redacted because it referenced request content.";
  }

  const sanitized = value
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/\bsk-[a-zA-Z0-9_-]+\b/g, "[redacted]")
    .replace(/\b[a-zA-Z0-9_-]{40,}\b/g, "[redacted]")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!sanitized) return "Provider error message was empty after sanitization.";
  if (sanitized.length <= MAX_DIAGNOSTIC_MESSAGE_LENGTH) return sanitized;
  return `${sanitized.slice(0, MAX_DIAGNOSTIC_MESSAGE_LENGTH - 3)}...`;
}

export function getSafeOpenAiErrorDiagnostic(
  error: unknown,
  model: string
): SafeOpenAiErrorDiagnostic {
  const apiError = error instanceof OpenAI.APIError ? error : null;
  const standardError = error instanceof Error ? error : null;

  return {
    errorClass: safeMetadata(standardError?.constructor.name) ?? "UnknownError",
    errorName: safeMetadata(standardError?.name) ?? "UnknownError",
    httpStatus: typeof apiError?.status === "number" ? apiError.status : null,
    providerErrorType: safeMetadata(apiError?.type),
    providerErrorCode: safeMetadata(apiError?.code),
    requestId: safeMetadata(apiError?.requestID),
    providerMessage: sanitizeOpenAiErrorMessage(standardError?.message),
    model: safeMetadata(model) ?? "unknown",
  };
}

export function logOpenAiErrorForDevelopment(error: unknown, model: string) {
  if (process.env.NODE_ENV === "production") return;

  console.error(
    "OpenAI ESG extraction provider error",
    getSafeOpenAiErrorDiagnostic(error, model)
  );
}
