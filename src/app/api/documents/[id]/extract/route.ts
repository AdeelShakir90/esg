import { MAX_DOCUMENT_SIZE_BYTES } from "@/lib/documents";
import {
  extractPdfText,
  PdfTextExtractionError,
} from "@/lib/pdf/extract-text";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DOCUMENTS_BUCKET = "documents";
const PDF_MIME_TYPE = "application/pdf";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{ id: string }>;
};

class SafeExtractionError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "SafeExtractionError";
  }
}

function json(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  return Response.json(data, { ...init, headers });
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!UUID_PATTERN.test(id)) {
    return json({ error: "A valid document UUID is required." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: document, error: lookupError } = await supabase
    .from("documents")
    .select("id, storage_path, file_type, file_size")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) {
    console.error("Document lookup failed before extraction:", lookupError.message);
    return json({ error: "The document could not be loaded." }, { status: 500 });
  }

  if (!document) {
    return json({ error: "Document not found." }, { status: 404 });
  }

  if (document.file_type.toLowerCase() !== PDF_MIME_TYPE) {
    return json({ error: "Only stored PDF documents can be extracted." }, { status: 415 });
  }

  if (document.file_size <= 0 || document.file_size > MAX_DOCUMENT_SIZE_BYTES) {
    return json(
      { error: "The stored PDF size is outside the supported range." },
      { status: 422 }
    );
  }

  const { error: processingError } = await supabase
    .from("documents")
    .update({
      extraction_status: "processing",
      extraction_error: null,
      extracted_text: null,
    })
    .eq("id", id);

  if (processingError) {
    console.error("Failed to mark document extraction as processing:", processingError.message);
    return json({ error: "Document extraction could not be started." }, { status: 500 });
  }

  try {
    const { data: storedPdf, error: downloadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .download(document.storage_path);

    if (downloadError) {
      throw new SafeExtractionError("The stored PDF could not be downloaded.", 502);
    }

    if (!storedPdf || storedPdf.size === 0) {
      throw new SafeExtractionError("The stored PDF is empty.", 422);
    }

    if (storedPdf.size > MAX_DOCUMENT_SIZE_BYTES) {
      throw new SafeExtractionError("The stored PDF exceeds the 5 MB limit.", 422);
    }

    const bytes = new Uint8Array(await storedPdf.arrayBuffer());
    const extraction = await extractPdfText(bytes);
    const extractedAt = new Date().toISOString();

    if (extraction.status === "no_text") {
      const noTextMessage =
        "No extractable text was found. The PDF may contain scanned images.";
      const { error: updateError } = await supabase
        .from("documents")
        .update({
          extraction_status: "no_text",
          extracted_text: null,
          page_count: extraction.pageCount,
          extracted_at: extractedAt,
          extraction_error: noTextMessage,
          parser_version: extraction.parserVersion,
        })
        .eq("id", id);

      if (updateError) {
        throw new SafeExtractionError("The extraction result could not be saved.", 500);
      }

      return json({
        id,
        extraction_status: "no_text",
        page_count: extraction.pageCount,
        character_count: 0,
        extracted_at: extractedAt,
        parser_version: extraction.parserVersion,
      });
    }

    const { error: updateError } = await supabase
      .from("documents")
      .update({
        extraction_status: "completed",
        extracted_text: extraction.text,
        page_count: extraction.pageCount,
        extracted_at: extractedAt,
        extraction_error: null,
        parser_version: extraction.parserVersion,
      })
      .eq("id", id);

    if (updateError) {
      throw new SafeExtractionError("The extraction result could not be saved.", 500);
    }

    return json({
      id,
      extraction_status: "completed",
      page_count: extraction.pageCount,
      character_count: extraction.text.length,
      extracted_at: extractedAt,
      parser_version: extraction.parserVersion,
    });
  } catch (error) {
    const safeMessage =
      error instanceof PdfTextExtractionError || error instanceof SafeExtractionError
        ? error.message
        : "The PDF text extraction failed.";
    const status = error instanceof SafeExtractionError ? error.status : 422;

    const { error: failureUpdateError } = await supabase
      .from("documents")
      .update({
        extraction_status: "failed",
        extraction_error: safeMessage,
        extracted_text: null,
        page_count: null,
        extracted_at: null,
        parser_version: null,
      })
      .eq("id", id);

    if (failureUpdateError) {
      console.error(
        "Failed to persist document extraction failure:",
        failureUpdateError.message
      );
    }

    console.error("Document extraction failed:", safeMessage);
    return json(
      {
        id,
        extraction_status: "failed",
        error: safeMessage,
      },
      { status }
    );
  }
}
