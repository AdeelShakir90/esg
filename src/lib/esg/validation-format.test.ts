import assert from "node:assert/strict";
import test from "node:test";

import type { ValidationField } from "./validation";
import {
  formatConfidence,
  formatExtractedValue,
  formatReportingPeriod,
  parseValidationDocumentId,
} from "./validation-format";

function field(overrides: Partial<ValidationField> = {}): ValidationField {
  return {
    id: "06f17e16-181f-4a06-a373-00a8a6dd485b",
    key: "electricity_consumption",
    label: "Electricity consumption",
    category: "environmental",
    status: "found",
    value: { type: "number", value: 1240 },
    unit: "MWh",
    reportingPeriod: { label: "2024", start: null, end: null },
    confidence: 0.94,
    evidence: { quote: "Evidence", page: null },
    validationStatus: "pending",
    validatedValue: null,
    updatedAt: "2026-10-08T10:00:00.000Z",
    ...overrides,
  };
}

test("accepts one UUID document parameter and rejects unsafe variants", () => {
  const id = "9c388a00-af6a-427e-a880-a1215e332267";
  assert.equal(parseValidationDocumentId(id), id);
  assert.equal(parseValidationDocumentId("not-a-uuid"), null);
  assert.equal(parseValidationDocumentId([id]), null);
  assert.equal(parseValidationDocumentId(undefined), null);
});

test("formats numbers, booleans, units, and not-found fields", () => {
  assert.equal(formatExtractedValue(field()), "1,240 MWh");
  assert.equal(
    formatExtractedValue(
      field({
        key: "supplier_code_of_conduct",
        value: { type: "boolean", value: true },
        unit: null,
      })
    ),
    "Yes"
  );
  assert.equal(
    formatExtractedValue(field({ status: "not_found", value: null, unit: null })),
    "Not found"
  );
});

test("formats reporting periods and confidence without inventing missing data", () => {
  assert.equal(formatReportingPeriod(field()), "2024");
  assert.equal(
    formatReportingPeriod(
      field({
        reportingPeriod: {
          label: null,
          start: "2024-01-01",
          end: "2024-12-31",
        },
      })
    ),
    "2024-01-01 to 2024-12-31"
  );
  assert.equal(
    formatReportingPeriod(
      field({ reportingPeriod: { label: null, start: null, end: null } })
    ),
    null
  );
  assert.equal(formatConfidence(0.876), "88%");
  assert.equal(formatConfidence(null), null);
});
