import { getAuthorizedValidation } from "@/lib/security/read-server";
import { validationReadResponse } from "@/lib/security/read-routes";
import { disabledWriteResponse } from "@/lib/security/disabled-writes";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return validationReadResponse(getAuthorizedValidation, request, id);
}

export const POST = disabledWriteResponse;
export const PUT = disabledWriteResponse;
export const PATCH = disabledWriteResponse;
export const DELETE = disabledWriteResponse;
