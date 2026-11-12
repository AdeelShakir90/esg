"use server";

import { getAuthorizedValidation } from "@/lib/security/read-server";
import { validationReadAction } from "@/lib/security/read-action";
export type { ValidationLoadResult, ValidationLoadErrorCode } from "@/lib/security/read-action";

export async function loadValidationData(documentId: string, organizationId: string | null = null) {
  return validationReadAction(getAuthorizedValidation, documentId, organizationId);
}
