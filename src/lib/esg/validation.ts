import { z } from "zod";

import {
  ESG_FIELD_DEFINITION_BY_KEY,
  ESG_FIELD_DEFINITIONS,
  ESG_FIELD_KEYS,
} from "./definitions";
import { EsgFieldValueSchema, validateEsgExtractionOutput } from "./schema";
import type { EsgFieldValue } from "./schema";

export const DOCUMENT_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ValidationDataErrorCode =
  | "invalid_document_id"
  | "document_not_found"
  | "extraction_not_found"
  | "stale_extraction"
  | "incomplete_extraction"
  | "data_unavailable";

export class ValidationDataError extends Error {
  constructor(
    readonly code: ValidationDataErrorCode,
    readonly publicMessage: string,
    readonly httpStatus: number
  ) {
    super(publicMessage);
    this.name = "ValidationDataError";
  }
}

export type ValidationDocumentSource = {
  id: string;
  file_name: string;
  extraction_status: string;
  extracted_at: string | null;
  parser_version: string | null;
};

export type ValidationExtractionSource = {
  id: string;
  document_id: string;
  status: string;
  schema_version: string;
  source_parser_version: string | null;
  source_extracted_at: string | null;
  created_at: string;
  completed_at: string | null;
};

export interface ValidationDataRepository {
  findDocument(documentId: string): Promise<ValidationDocumentSource | null>;
  findCompletedExtractions(
    documentId: string
  ): Promise<ValidationExtractionSource[]>;
  findFields(extractionId: string): Promise<unknown[]>;
}

export type ValidationField = {
  id: string;
  key: (typeof ESG_FIELD_KEYS)[number];
  label: string;
  category: "environmental" | "social" | "governance";
  status: "found" | "not_found";
  value: EsgFieldValue | null;
  unit: string | null;
  reportingPeriod: {
    label: string | null;
    start: string | null;
    end: string | null;
  };
  confidence: number | null;
  evidence: {
    quote: string | null;
    page: null;
  };
  validationStatus: "pending" | "approved" | "rejected" | "edited";
  validatedValue: EsgFieldValue | null;
  updatedAt: string;
};

export type ValidationData = {
  document: {
    id: string;
    fileName: string;
  };
  extraction: {
    id: string;
    schemaVersion: string;
    completedAt: string;
  };
  fields: ValidationField[];
};

const StoredFieldSchema = z
  .object({
    id: z.string().regex(DOCUMENT_UUID_PATTERN),
    extraction_id: z.string().regex(DOCUMENT_UUID_PATTERN),
    field_key: z.enum(ESG_FIELD_KEYS),
    label: z.string().trim().min(1).max(100),
    category: z.enum(["environmental", "social", "governance"]),
    status: z.enum(["found", "not_found"]),
    value: EsgFieldValueSchema.nullable(),
    unit: z.string().trim().min(1).max(50).nullable(),
    reporting_period_label: z.string().trim().min(1).max(100).nullable(),
    reporting_period_start: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    reporting_period_end: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    confidence: z.number().min(0).max(1).nullable(),
    evidence_quote: z.string().trim().min(1).max(500).nullable(),
    evidence_page: z.null(),
    validation_status: z.enum(["pending", "approved", "rejected", "edited"]),
    validated_value: EsgFieldValueSchema.nullable(),
    updated_at: z.string().trim().min(1),
  })
  .strict();

type StoredField = z.infer<typeof StoredFieldSchema>;

function fail(
  code: ValidationDataErrorCode,
  message: string,
  status: number
): never {
  throw new ValidationDataError(code, message, status);
}

export function assertValidDocumentId(documentId: string) {
  if (!DOCUMENT_UUID_PATTERN.test(documentId)) {
    fail("invalid_document_id", "A valid document UUID is required.", 400);
  }
}

function timestampValue(value: string | null) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function extractionMatchesDocument(
  document: ValidationDocumentSource,
  extraction: ValidationExtractionSource
) {
  const documentTimestamp = timestampValue(document.extracted_at);
  const sourceTimestamp = timestampValue(extraction.source_extracted_at);

  return (
    document.extraction_status === "completed" &&
    documentTimestamp !== null &&
    sourceTimestamp !== null &&
    documentTimestamp === sourceTimestamp &&
    document.parser_version !== null &&
    document.parser_version === extraction.source_parser_version
  );
}

export function selectLatestCompletedExtraction(
  extractions: readonly ValidationExtractionSource[]
) {
  return (
    extractions
      .filter((extraction) => extraction.status === "completed")
      .toSorted((left, right) => {
        const dateDifference =
          (timestampValue(right.created_at) ?? 0) -
          (timestampValue(left.created_at) ?? 0);
        return dateDifference || right.id.localeCompare(left.id);
      })[0] ?? null
  );
}

function parseFields(rawFields: unknown[], extractionId: string) {
  const parsed = z.array(StoredFieldSchema).safeParse(rawFields);
  if (!parsed.success) {
    fail(
      "incomplete_extraction",
      "The completed ESG extraction contains invalid field data.",
      422
    );
  }

  const fields = parsed.data;
  const keys = fields.map((field) => field.field_key);
  if (
    fields.length !== ESG_FIELD_DEFINITIONS.length ||
    new Set(keys).size !== ESG_FIELD_DEFINITIONS.length ||
    fields.some((field) => field.extraction_id !== extractionId)
  ) {
    fail(
      "incomplete_extraction",
      "The completed ESG extraction does not contain 12 unique fields.",
      422
    );
  }

  try {
    validateEsgExtractionOutput({
      fields: fields.map((field) => ({
        key: field.field_key,
        label: field.label,
        category: field.category,
        status: field.status,
        value: field.value,
        unit: field.unit,
        reporting_period: {
          label: field.reporting_period_label,
          start: field.reporting_period_start,
          end: field.reporting_period_end,
        },
        confidence: field.confidence,
        evidence: {
          quote: field.evidence_quote,
          page: field.evidence_page,
        },
      })),
    });
  } catch {
    fail(
      "incomplete_extraction",
      "The completed ESG extraction contains inconsistent field data.",
      422
    );
  }

  for (const field of fields) {
    const definition = ESG_FIELD_DEFINITION_BY_KEY.get(field.field_key);
    if (
      !definition ||
      (field.validated_value !== null &&
        field.validated_value.type !== definition.valueType) ||
      (field.validation_status === "edited") !==
        (field.validated_value !== null) ||
      ("percentage" in definition &&
        definition.percentage &&
        field.validated_value?.type === "number" &&
        field.validated_value.value > 100)
    ) {
      fail(
        "incomplete_extraction",
        "The completed ESG extraction contains invalid validation data.",
        422
      );
    }
  }

  return fields;
}

function toValidationField(field: StoredField): ValidationField {
  return {
    id: field.id,
    key: field.field_key,
    label: field.label,
    category: field.category,
    status: field.status,
    value: field.value,
    unit: field.unit,
    reportingPeriod: {
      label: field.reporting_period_label,
      start: field.reporting_period_start,
      end: field.reporting_period_end,
    },
    confidence: field.confidence,
    evidence: {
      quote: field.evidence_quote,
      page: field.evidence_page,
    },
    validationStatus: field.validation_status,
    validatedValue: field.validated_value,
    updatedAt: field.updated_at,
  };
}

export async function loadValidationData(
  documentId: string,
  repository: ValidationDataRepository
): Promise<ValidationData> {
  assertValidDocumentId(documentId);

  const document = await repository.findDocument(documentId);
  if (!document) {
    fail("document_not_found", "Document not found.", 404);
  }

  const extraction = selectLatestCompletedExtraction(
    await repository.findCompletedExtractions(documentId)
  );
  if (!extraction) {
    fail(
      "extraction_not_found",
      "No completed ESG extraction was found for this document.",
      404
    );
  }

  if (
    extraction.document_id !== document.id ||
    !extraction.completed_at ||
    !extractionMatchesDocument(document, extraction)
  ) {
    fail(
      "stale_extraction",
      "The ESG extraction does not match the document's current extracted text.",
      409
    );
  }

  const fields = parseFields(
    await repository.findFields(extraction.id),
    extraction.id
  );
  const fieldByKey = new Map(fields.map((field) => [field.field_key, field]));

  return {
    document: {
      id: document.id,
      fileName: document.file_name,
    },
    extraction: {
      id: extraction.id,
      schemaVersion: extraction.schema_version,
      completedAt: extraction.completed_at,
    },
    fields: ESG_FIELD_DEFINITIONS.map((definition) => {
      const field = fieldByKey.get(definition.key);
      if (!field) {
        return fail(
          "incomplete_extraction",
          "The completed ESG extraction is missing a required field.",
          422
        );
      }
      return toValidationField(field);
    }),
  };
}
