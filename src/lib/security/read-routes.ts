import { readErrorResponse } from "./read-response";

export async function documentsReadResponse(
  reader: (selected: string | null) => Promise<unknown>, request: Request
) {
  try {
    const result = await reader(new URL(request.url).searchParams.get("organizationId"));
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return readErrorResponse(error); }
}

export async function validationReadResponse(
  reader: (id: string, selected: string | null) => Promise<unknown>, request: Request, id: string
) {
  try {
    const result = await reader(id, new URL(request.url).searchParams.get("organizationId"));
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return readErrorResponse(error); }
}
