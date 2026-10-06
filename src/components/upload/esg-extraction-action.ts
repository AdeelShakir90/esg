"use server";

import { POST as postEsgExtraction } from "@/app/api/documents/[id]/esg-extraction/route";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type EsgExtractionActionResult =
  | { success: true; extractionId: string }
  | { success: false };

function getExtractionId(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("extraction" in payload)) {
    return null;
  }

  const extraction = payload.extraction;
  if (!extraction || typeof extraction !== "object" || !("id" in extraction)) {
    return null;
  }

  return typeof extraction.id === "string" && UUID_PATTERN.test(extraction.id)
    ? extraction.id
    : null;
}

export async function triggerEsgExtraction(
  documentId: string
): Promise<EsgExtractionActionResult> {
  if (!UUID_PATTERN.test(documentId)) return { success: false };

  const accessToken = process.env.MVP_API_ACCESS_TOKEN?.trim();
  if (!accessToken) return { success: false };

  try {
    const response = await postEsgExtraction(
      new Request(
        `http://internal/api/documents/${documentId}/esg-extraction`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      ),
      { params: Promise.resolve({ id: documentId }) }
    );

    if (!response.ok) return { success: false };

    const extractionId = getExtractionId(await response.json());
    return extractionId
      ? { success: true, extractionId }
      : { success: false };
  } catch {
    return { success: false };
  }
}
