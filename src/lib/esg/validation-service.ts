import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

import {
  assertValidDocumentId,
  loadValidationData,
  ValidationDataError,
  type ValidationDataRepository,
  type ValidationDocumentSource,
  type ValidationExtractionSource,
} from "./validation";

function unavailable(): never {
  throw new ValidationDataError(
    "data_unavailable",
    "The ESG validation data could not be loaded.",
    500
  );
}

function createSupabaseValidationRepository(): ValidationDataRepository {
  const supabase = getSupabaseAdmin();

  return {
    async findDocument(documentId) {
      const { data, error } = await supabase
        .from("documents")
        .select(
          "id, file_name, extraction_status, extracted_at, parser_version"
        )
        .eq("id", documentId)
        .maybeSingle();

      if (error) unavailable();
      return (data as ValidationDocumentSource | null) ?? null;
    },

    async findCompletedExtractions(documentId) {
      const { data, error } = await supabase
        .from("esg_extractions")
        .select(
          "id, document_id, status, schema_version, source_parser_version, source_extracted_at, created_at, completed_at"
        )
        .eq("document_id", documentId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(2);

      if (error) unavailable();
      return (data as ValidationExtractionSource[] | null) ?? [];
    },

    async findFields(extractionId) {
      const { data, error } = await supabase
        .from("extracted_esg_fields")
        .select(
          "id, extraction_id, field_key, label, category, status, value, unit, reporting_period_label, reporting_period_start, reporting_period_end, confidence, evidence_quote, evidence_page, validation_status, validated_value, updated_at"
        )
        .eq("extraction_id", extractionId);

      if (error) unavailable();
      return data ?? [];
    },
  };
}

export function getValidationData(documentId: string) {
  assertValidDocumentId(documentId);
  return loadValidationData(documentId, createSupabaseValidationRepository());
}
