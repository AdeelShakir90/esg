import { ApiError } from "@google/genai";

const MAX_DIAGNOSTIC_MESSAGE_LENGTH = 240;

export type SafeGeminiErrorDiagnostic = {
  errorClass: string;
  errorName: string;
  httpStatus: number | null;
  providerErrorStatus: string | null;
  providerErrorCode: string | null;
  providerMessage: string;
  model: string;
};

function safeMetadata(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const sanitized = String(value).replace(/[^a-zA-Z0-9._:-]/g, "").slice(0, 100);
  return sanitized || null;
}

export function sanitizeGeminiErrorMessage(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "No provider error message was available.";
  }

  if (
    /document_text|authorization|systemInstruction|contents|prompt|api[_ -]?key|instructions|input["':\s]/i.test(
      value
    )
  ) {
    return "Provider message was redacted because it referenced request content.";
  }

  const sanitized = value
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/\bAIza[a-zA-Z0-9_-]+\b/g, "[redacted]")
    .replace(/\b[a-zA-Z0-9_-]{40,}\b/g, "[redacted]")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!sanitized) return "Provider error message was empty after sanitization.";
  if (sanitized.length <= MAX_DIAGNOSTIC_MESSAGE_LENGTH) return sanitized;
  return `${sanitized.slice(0, MAX_DIAGNOSTIC_MESSAGE_LENGTH - 3)}...`;
}

export function getSafeGeminiErrorDiagnostic(
  error: unknown,
  model: string
): SafeGeminiErrorDiagnostic {
  const apiError = error instanceof ApiError ? error : null;
  const standardError = error instanceof Error ? error : null;
  const providerMetadata = error as
    | { code?: unknown; status?: unknown; errorStatus?: unknown }
    | null;

  return {
    errorClass: safeMetadata(standardError?.constructor.name) ?? "UnknownError",
    errorName: safeMetadata(standardError?.name) ?? "UnknownError",
    httpStatus: typeof apiError?.status === "number" ? apiError.status : null,
    providerErrorStatus: safeMetadata(providerMetadata?.errorStatus),
    providerErrorCode: safeMetadata(providerMetadata?.code),
    providerMessage: sanitizeGeminiErrorMessage(standardError?.message),
    model: safeMetadata(model) ?? "unknown",
  };
}

export function logGeminiErrorForDevelopment(error: unknown, model: string) {
  if (process.env.NODE_ENV === "production") return;

  console.error(
    "Gemini ESG extraction provider error",
    getSafeGeminiErrorDiagnostic(error, model)
  );
}
