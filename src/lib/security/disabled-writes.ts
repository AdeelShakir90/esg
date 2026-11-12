export const WRITE_DISABLED_MESSAGE = "Document writes and processing are temporarily disabled pending security verification.";

export function disabledWriteResponse() {
  return Response.json({ error: { code: "writes_disabled", message: WRITE_DISABLED_MESSAGE } }, {
    status: 503, headers: { "Cache-Control": "private, no-store" },
  });
}
