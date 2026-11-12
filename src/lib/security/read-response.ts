import { ReadAccessError } from "./read-access";
import { ValidationDataError } from "../esg/validation";

export function readErrorResponse(error: unknown) {
  const status = error instanceof ReadAccessError ? error.status : error instanceof ValidationDataError ? error.httpStatus : 503;
  const code = error instanceof ValidationDataError ? error.code : status === 401 ? "unauthorized" : status === 403 ? "forbidden" : status === 404 ? "document_not_found" : "reads_disabled";
  const message = error instanceof ReadAccessError ? error.message : error instanceof ValidationDataError ? error.publicMessage : "Document access is temporarily unavailable.";
  return Response.json({ error: { code, message } }, { status, headers: { "Cache-Control": "private, no-store" } });
}
