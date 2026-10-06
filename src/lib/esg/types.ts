import type { EsgCategory, EsgFieldKey } from "./definitions";
import type { EsgFieldValue } from "./schema";

export type EsgExtractionStatus = "processing" | "completed" | "failed";
export type EsgFieldStatus = "found" | "not_found";
export type EsgValidationStatus = "pending" | "approved" | "rejected" | "edited";

export type EsgExtractionRow = {
  id: string;
  document_id: string;
  status: EsgExtractionStatus;
  schema_version: string;
  provider: string;
  model: string;
  prompt_version: string;
  source_parser_version: string | null;
  source_extracted_at: string | null;
  created_at: string;
  completed_at: string | null;
  error: string | null;
};

export type EsgExtractionInsert = Omit<
  EsgExtractionRow,
  "id" | "created_at" | "completed_at" | "error"
> & {
  id?: string;
  created_at?: string;
  completed_at?: string | null;
  error?: string | null;
};

export type ExtractedEsgFieldRow = {
  id: string;
  extraction_id: string;
  field_key: EsgFieldKey;
  label: string;
  category: EsgCategory;
  status: EsgFieldStatus;
  value: EsgFieldValue | null;
  unit: string | null;
  reporting_period_label: string | null;
  reporting_period_start: string | null;
  reporting_period_end: string | null;
  confidence: number | null;
  evidence_quote: string | null;
  evidence_page: null;
  validation_status: EsgValidationStatus;
  validated_value: EsgFieldValue | null;
  created_at: string;
  updated_at: string;
};

export type ExtractedEsgFieldInsert = Omit<
  ExtractedEsgFieldRow,
  "id" | "created_at" | "updated_at" | "validation_status" | "validated_value"
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  validation_status?: EsgValidationStatus;
  validated_value?: EsgFieldValue | null;
};
