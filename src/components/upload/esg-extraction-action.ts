"use server";

export type EsgExtractionActionResult =
  | { success: true; extractionId: string }
  | { success: false; code: "writes_disabled"; status: 503 };

export async function triggerEsgExtraction(documentId: string): Promise<EsgExtractionActionResult> {
  void documentId;
  return { success: false, code: "writes_disabled", status: 503 };
}
