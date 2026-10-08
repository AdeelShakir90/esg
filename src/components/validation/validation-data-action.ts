"use server";

import { GET as getValidationRoute } from "@/app/api/documents/[id]/validation/route";
import type {
  ValidationData,
  ValidationDataErrorCode,
} from "@/lib/esg/validation";
import { parseValidationDocumentId } from "@/lib/esg/validation-format";

export type ValidationLoadErrorCode =
  | ValidationDataErrorCode
  | "unauthorized"
  | "invalid_response";

export type ValidationLoadResult =
  | { success: true; validation: ValidationData }
  | { success: false; code: ValidationLoadErrorCode };

const VALIDATION_ERROR_CODES = new Set<ValidationDataErrorCode>([
  "invalid_document_id",
  "document_not_found",
  "extraction_not_found",
  "stale_extraction",
  "incomplete_extraction",
  "data_unavailable",
]);

function getErrorCode(payload: unknown): ValidationDataErrorCode | null {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return null;
  }

  const error = payload.error;
  if (!error || typeof error !== "object" || !("code" in error)) {
    return null;
  }

  return typeof error.code === "string" &&
    VALIDATION_ERROR_CODES.has(error.code as ValidationDataErrorCode)
    ? (error.code as ValidationDataErrorCode)
    : null;
}

function getValidationPayload(payload: unknown): ValidationData | null {
  if (!payload || typeof payload !== "object" || !("validation" in payload)) {
    return null;
  }

  const validation = payload.validation;
  if (
    !validation ||
    typeof validation !== "object" ||
    !("document" in validation) ||
    !("extraction" in validation) ||
    !("fields" in validation) ||
    !Array.isArray(validation.fields)
  ) {
    return null;
  }

  return validation as ValidationData;
}

export async function loadValidationData(
  documentId: string
): Promise<ValidationLoadResult> {
  const validatedDocumentId = parseValidationDocumentId(documentId);
  if (!validatedDocumentId) {
    return { success: false, code: "invalid_document_id" };
  }

  const accessToken = process.env.MVP_API_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    return { success: false, code: "unauthorized" };
  }

  try {
    const response = await getValidationRoute(
      new Request(
        `http://internal/api/documents/${validatedDocumentId}/validation`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      ),
      { params: Promise.resolve({ id: validatedDocumentId }) }
    );
    const payload: unknown = await response.json();

    if (!response.ok) {
      return {
        success: false,
        code:
          response.status === 401
            ? "unauthorized"
            : (getErrorCode(payload) ?? "data_unavailable"),
      };
    }

    const validation = getValidationPayload(payload);
    return validation
      ? { success: true, validation }
      : { success: false, code: "invalid_response" };
  } catch {
    return { success: false, code: "data_unavailable" };
  }
}
