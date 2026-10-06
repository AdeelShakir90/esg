import {
  ESG_PROMPT_VERSION,
  ESG_SCHEMA_VERSION,
} from "@/lib/esg/definitions";
import { EsgExtractionError } from "@/lib/esg/errors";
import {
  extractStructuredEsgData,
  getEsgExtractionProvider,
} from "@/lib/esg/extract";
import { withMvpApiAccess } from "@/lib/esg/mvp-access";
import type { ExtractedEsgFieldInsert } from "@/lib/esg/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{ id: string }>;
};

function json(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  return Response.json(data, { ...init, headers });
}

function safeFailure(error: unknown) {
  if (error instanceof EsgExtractionError) {
    return {
      code: error.code,
      message: error.publicMessage,
      status: error.httpStatus,
    };
  }

  return {
    code: "internal_error",
    message: "The ESG extraction could not be completed.",
    status: 500,
  };
}

async function handleAuthorizedPost(context: RouteContext) {
  const { id } = await context.params;

  if (!UUID_PATTERN.test(id)) {
    return json({ error: "A valid document UUID is required." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, extraction_status, extracted_text, parser_version, extracted_at")
    .eq("id", id)
    .maybeSingle();

  if (documentError) {
    console.error("Document lookup failed before ESG extraction", {
      code: documentError.code,
      documentId: id,
    });
    return json({ error: "The document could not be loaded." }, { status: 500 });
  }

  if (!document) {
    return json({ error: "Document not found." }, { status: 404 });
  }

  if (
    document.extraction_status !== "completed" ||
    !document.extracted_text?.trim()
  ) {
    return json(
      { error: "The document must have completed text extraction first." },
      { status: 409 }
    );
  }

  let providerConfig: ReturnType<typeof getEsgExtractionProvider>;
  try {
    providerConfig = getEsgExtractionProvider();
  } catch (error) {
    const failure = safeFailure(error);
    return json({ error: failure.message }, { status: failure.status });
  }

  const { data: run, error: runError } = await supabase
    .from("esg_extractions")
    .insert({
      document_id: document.id,
      status: "processing",
      schema_version: ESG_SCHEMA_VERSION,
      provider: providerConfig.provider,
      model: providerConfig.model,
      prompt_version: ESG_PROMPT_VERSION,
      source_parser_version: document.parser_version,
      source_extracted_at: document.extracted_at,
    })
    .select("id, document_id, status, schema_version, provider, model, prompt_version, created_at")
    .single();

  if (runError || !run) {
    console.error("Failed to create ESG extraction run", {
      code: runError?.code ?? "missing_row",
      documentId: id,
    });
    return json({ error: "The ESG extraction could not be started." }, { status: 500 });
  }

  try {
    const extraction = await extractStructuredEsgData(
      document.extracted_text,
      providerConfig
    );
    const fieldRows: ExtractedEsgFieldInsert[] = extraction.result.fields.map((field) => ({
      extraction_id: run.id,
      field_key: field.key,
      label: field.label,
      category: field.category,
      status: field.status,
      value: field.value,
      unit: field.unit,
      reporting_period_label: field.reporting_period.label,
      reporting_period_start: field.reporting_period.start,
      reporting_period_end: field.reporting_period.end,
      confidence: field.confidence,
      evidence_quote: field.evidence.quote,
      evidence_page: null,
    }));

    const { error: fieldsError } = await supabase
      .from("extracted_esg_fields")
      .insert(fieldRows);

    if (fieldsError) {
      console.error("Failed to persist ESG extraction fields", {
        code: fieldsError.code,
        extractionId: run.id,
      });
      throw new Error("field_persistence_failed");
    }

    const completedAt = new Date().toISOString();
    const { error: completionError } = await supabase
      .from("esg_extractions")
      .update({
        status: "completed",
        completed_at: completedAt,
        error: null,
      })
      .eq("id", run.id);

    if (completionError) {
      console.error("Failed to complete ESG extraction run", {
        code: completionError.code,
        extractionId: run.id,
      });
      throw new Error("run_completion_failed");
    }

    return json({
      extraction: {
        id: run.id,
        document_id: run.document_id,
        status: "completed",
        schema_version: run.schema_version,
        provider: run.provider,
        model: run.model,
        prompt_version: run.prompt_version,
        created_at: run.created_at,
        completed_at: completedAt,
      },
      fields: extraction.result.fields,
    });
  } catch (error) {
    const failure = safeFailure(error);

    const { error: cleanupError } = await supabase
      .from("extracted_esg_fields")
      .delete()
      .eq("extraction_id", run.id);

    if (cleanupError) {
      console.error("Failed to clean up incomplete ESG fields", {
        code: cleanupError.code,
        extractionId: run.id,
      });
    }

    const { error: failureError } = await supabase
      .from("esg_extractions")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error: failure.message,
      })
      .eq("id", run.id);

    if (failureError) {
      console.error("Failed to persist ESG extraction failure", {
        code: failureError.code,
        extractionId: run.id,
      });
    }

    console.error("ESG extraction request failed", {
      code: failure.code,
      documentId: id,
      extractionId: run.id,
    });

    return json({ error: failure.message }, { status: failure.status });
  }
}

// This shared secret is a controlled-MVP access boundary, not user identity or
// document ownership authorization. Real tenant auth and rate limiting remain
// required before customer or pilot use.
export function POST(request: Request, context: RouteContext) {
  return withMvpApiAccess(
    request,
    process.env.MVP_API_ACCESS_TOKEN,
    () => handleAuthorizedPost(context)
  );
}
