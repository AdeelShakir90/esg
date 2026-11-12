import { getAuthorizedDocuments } from "@/lib/security/read-server";
import { documentsReadResponse } from "@/lib/security/read-routes";
import { disabledWriteResponse } from "@/lib/security/disabled-writes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return documentsReadResponse(getAuthorizedDocuments, request);
}

export const POST = disabledWriteResponse;
export const PUT = disabledWriteResponse;
export const PATCH = disabledWriteResponse;
export const DELETE = disabledWriteResponse;
