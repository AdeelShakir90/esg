import type { ValidationData, ValidationDataErrorCode } from "../esg/validation";
import { readErrorResponse } from "./read-response";

export type ValidationLoadErrorCode = ValidationDataErrorCode | "unauthorized" | "forbidden" | "reads_disabled" | "invalid_response";
export type ValidationLoadResult =
  | { success: true; validation: ValidationData; scopeKey: string }
  | { success: false; code: ValidationLoadErrorCode };

export async function validationReadAction(
  reader: (id: string, selected: string | null) => Promise<{ validation: ValidationData; scopeKey: string }>,
  id: string,
  selected: string | null
): Promise<ValidationLoadResult> {
  try { return { success: true, ...await reader(id, selected) }; }
  catch (error) {
    const response = readErrorResponse(error);
    const body = await response.json();
    return { success: false, code: body.error.code };
  }
}
