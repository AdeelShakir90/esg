import assert from "node:assert/strict";
import test from "node:test";

import { ESG_FIELD_DEFINITIONS } from "./definitions";
import {
  loadValidationData,
  selectLatestCompletedExtraction,
  ValidationDataError,
  type ValidationDataRepository,
  type ValidationDocumentSource,
  type ValidationExtractionSource,
} from "./validation";

const DOCUMENT_ID = "11111111-1111-4111-8111-111111111111";
const OLD_EXTRACTION_ID = "22222222-2222-4222-8222-222222222222";
const LATEST_EXTRACTION_ID = "33333333-3333-4333-8333-333333333333";
const EXTRACTED_AT = "2026-10-06T10:00:00.000Z";

const document: ValidationDocumentSource = {
  id: DOCUMENT_ID,
  file_name: "fictional-esg-report.pdf",
  extraction_status: "completed",
  extracted_at: EXTRACTED_AT,
  parser_version: "unpdf-1",
};

function extraction(
  id = LATEST_EXTRACTION_ID,
  createdAt = "2026-10-06T10:05:00.000Z"
): ValidationExtractionSource {
  return {
    id,
    document_id: DOCUMENT_ID,
    status: "completed",
    schema_version: "esg-core-v1",
    source_parser_version: "unpdf-1",
    source_extracted_at: EXTRACTED_AT,
    created_at: createdAt,
    completed_at: "2026-10-06T10:06:00.000Z",
  };
}

function valueFor(definition: (typeof ESG_FIELD_DEFINITIONS)[number]) {
  if (definition.valueType === "integer") {
    return { type: "integer" as const, value: 10 };
  }
  if (definition.valueType === "boolean") {
    return { type: "boolean" as const, value: true };
  }
  return { type: "number" as const, value: 10 };
}

function fields(extractionId = LATEST_EXTRACTION_ID) {
  return ESG_FIELD_DEFINITIONS.map((definition, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    extraction_id: extractionId,
    field_key: definition.key,
    label: definition.label,
    category: definition.category,
    status: "found",
    value: valueFor(definition),
    unit: definition.valueType === "boolean" ? null : "unit",
    reporting_period_label: "FY 2025",
    reporting_period_start: "2025-01-01",
    reporting_period_end: "2025-12-31",
    confidence: 0.9,
    evidence_quote: `Fictional evidence ${index + 1}`,
    evidence_page: null,
    validation_status: "pending",
    validated_value: null,
    updated_at: "2026-10-06T10:06:00.000Z",
  }));
}

function repository(overrides: {
  document?: ValidationDocumentSource | null;
  extractions?: ValidationExtractionSource[];
  fields?: unknown[];
} = {}): ValidationDataRepository {
  return {
    async findDocument() {
      return overrides.document === undefined ? document : overrides.document;
    },
    async findCompletedExtractions() {
      return overrides.extractions ?? [extraction()];
    },
    async findFields() {
      return overrides.fields ?? fields();
    },
  };
}

async function expectError(
  promise: Promise<unknown>,
  code: ValidationDataError["code"]
) {
  await assert.rejects(
    promise,
    (error) => error instanceof ValidationDataError && error.code === code
  );
}

test("rejects an invalid document UUID before repository access", async () => {
  let calls = 0;
  const repo = repository();
  const guardedRepo: ValidationDataRepository = {
    async findDocument(id) {
      calls += 1;
      return repo.findDocument(id);
    },
    async findCompletedExtractions(id) {
      calls += 1;
      return repo.findCompletedExtractions(id);
    },
    async findFields(id) {
      calls += 1;
      return repo.findFields(id);
    },
  };

  await expectError(
    loadValidationData("not-a-document-uuid", guardedRepo),
    "invalid_document_id"
  );
  assert.equal(calls, 0);
});

test("reports missing documents and completed extractions safely", async () => {
  await expectError(
    loadValidationData(DOCUMENT_ID, repository({ document: null })),
    "document_not_found"
  );
  await expectError(
    loadValidationData(DOCUMENT_ID, repository({ extractions: [] })),
    "extraction_not_found"
  );
});

test("selects the latest completed extraction deterministically", () => {
  const latest = extraction();
  const old = extraction(OLD_EXTRACTION_ID, "2026-10-05T10:05:00.000Z");
  const processing = { ...latest, id: OLD_EXTRACTION_ID, status: "processing" };

  assert.equal(
    selectLatestCompletedExtraction([old, processing, latest])?.id,
    LATEST_EXTRACTION_ID
  );
});

test("rejects an extraction based on stale document text", async () => {
  await expectError(
    loadValidationData(
      DOCUMENT_ID,
      repository({
        document: {
          ...document,
          extracted_at: "2026-10-07T10:00:00.000Z",
        },
      })
    ),
    "stale_extraction"
  );
});

test("rejects missing and duplicate ESG fields", async () => {
  const completeFields = fields();
  await expectError(
    loadValidationData(
      DOCUMENT_ID,
      repository({ fields: completeFields.slice(0, -1) })
    ),
    "incomplete_extraction"
  );

  await expectError(
    loadValidationData(
      DOCUMENT_ID,
      repository({
        fields: [...completeFields.slice(0, -1), completeFields[0]],
      })
    ),
    "incomplete_extraction"
  );
});

test("sorts fields in canonical ESG definition order", async () => {
  const result = await loadValidationData(
    DOCUMENT_ID,
    repository({ fields: fields().toReversed() })
  );

  assert.deepEqual(
    result.fields.map((field) => field.key),
    ESG_FIELD_DEFINITIONS.map((definition) => definition.key)
  );
});

test("returns only the safe validation response shape", async () => {
  const result = await loadValidationData(DOCUMENT_ID, repository());

  assert.deepEqual(Object.keys(result), ["document", "extraction", "fields"]);
  assert.deepEqual(Object.keys(result.document), ["id", "fileName"]);
  assert.deepEqual(Object.keys(result.extraction), [
    "id",
    "schemaVersion",
    "completedAt",
  ]);
  assert.equal(result.fields.length, 12);

  const serialized = JSON.stringify(result);
  for (const forbidden of [
    "storage_path",
    "extracted_text",
    "provider",
    "model",
    "prompt",
    "apiKey",
    "accessToken",
    "SUPABASE",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});
