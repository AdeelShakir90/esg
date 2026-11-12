import { disabledWriteResponse } from "@/lib/security/disabled-writes";

export const POST = disabledWriteResponse;
export const PUT = disabledWriteResponse;
export const PATCH = disabledWriteResponse;
export const DELETE = disabledWriteResponse;
