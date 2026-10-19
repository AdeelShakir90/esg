import assert from "node:assert/strict";
import test from "node:test";

import { projectDashboardData } from "./dashboard";
import { ESG_FIELD_DEFINITIONS } from "./definitions";
import type { ValidationData, ValidationField } from "./validation";
import { parseValidationDocumentId } from "./validation-format";
import {
  createDemoReviewSession,
  getDemoReviewScope,
  setDemoReviewDecision,
} from "./validation-review";

const DOCUMENT_ID = "9c388a00-af6a-427e-a880-a1215e332267";
const EXTRACTION_ID = "d2a9f734-4d8e-460d-b416-5cdd4762ab2d";

function makeField(
  definition: (typeof ESG_FIELD_DEFINITIONS)[number],
  index: number
): ValidationField {
  const value =
    definition.valueType === "boolean"
      ? ({ type: "boolean", value: index % 2 === 0 } as const)
      : definition.valueType === "integer"
        ? ({ type: "integer", value: 100 + index } as const)
        : ({ type: "number", value: 10.5 + index } as const);

  return {
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    key: definition.key,
    label: definition.label,
    category: definition.category,
    status: "found",
    value,
    unit:
      definition.valueType === "boolean"
        ? null
        : "percentage" in definition && definition.percentage
          ? "%"
          : "unit",
    reportingPeriod: { label: "2026", start: null, end: null },
    confidence: 0.9,
    evidence: { quote: `Evidence ${index + 1}`, page: null },
    validationStatus: "pending",
    validatedValue: null,
    updatedAt: "2026-10-19T10:00:00.000Z",
  };
}

function makeValidationData(): ValidationData {
  return {
    document: { id: DOCUMENT_ID, fileName: "sustainability-report.pdf" },
    extraction: {
      id: EXTRACTION_ID,
      schemaVersion: "esg-core-v1",
      completedAt: "2026-10-19T10:00:00.000Z",
    },
    fields: ESG_FIELD_DEFINITIONS.map(makeField),
  };
}

test("projects all 12 ESG fields in canonical order with category counts", () => {
  const projection = projectDashboardData(makeValidationData());

  assert.equal(projection.total, 12);
  assert.equal(projection.found, 12);
  assert.equal(projection.notFound, 0);
  assert.deepEqual(
    projection.categories.map(({ category, total }) => [category, total]),
    [
      ["environmental", 8],
      ["social", 2],
      ["governance", 2],
    ]
  );
  assert.deepEqual(
    projection.categories.flatMap(({ indicators }) =>
      indicators.map(({ key }) => key)
    ),
    ESG_FIELD_DEFINITIONS.map(({ key }) => key)
  );
});

test("keeps not-found fields empty without inventing fallback data", () => {
  const validation = makeValidationData();
  validation.fields[0] = {
    ...validation.fields[0],
    status: "not_found",
    value: null,
    unit: null,
    reportingPeriod: { label: null, start: null, end: null },
    confidence: null,
    evidence: { quote: null, page: null },
  };

  const projection = projectDashboardData(validation);
  const electricity = projection.categories[0].indicators[0];

  assert.equal(projection.found, 11);
  assert.equal(projection.notFound, 1);
  assert.equal(projection.categories[0].found, 7);
  assert.equal(projection.categories[0].notFound, 1);
  assert.equal(electricity.displayValue, "Not found");
  assert.equal(electricity.sourceValue, null);
  assert.equal(electricity.effectiveValue, null);
  assert.equal(electricity.unit, null);
});

test("formats boolean fields without converting them to numeric values", () => {
  const projection = projectDashboardData(makeValidationData());
  const governance = projection.categories.find(
    ({ category }) => category === "governance"
  );

  assert.deepEqual(
    governance?.indicators.map(({ displayValue, unit }) => [displayValue, unit]),
    [
      ["Yes", null],
      ["No", null],
    ]
  );
});

test("rejects incomplete or duplicate dashboard field sets", () => {
  const missing = makeValidationData();
  missing.fields = missing.fields.slice(0, -1);
  assert.throws(() => projectDashboardData(missing), /12 unique ESG fields/);

  const duplicate = makeValidationData();
  duplicate.fields[11] = duplicate.fields[10];
  assert.throws(() => projectDashboardData(duplicate), /12 unique ESG fields/);
});

test("carries a scoped edited value to the dashboard without changing source data", () => {
  const validation = makeValidationData();
  const editedField = validation.fields[0];
  editedField.value = { type: "number", value: 1240 };
  editedField.unit = "MWh";
  const approvedField = validation.fields[1];
  const rejectedField = validation.fields[2];
  const originalValue = structuredClone(editedField.value);
  const originalEvidence = structuredClone(editedField.evidence);
  const scope = getDemoReviewScope(DOCUMENT_ID, EXTRACTION_ID);
  let session = setDemoReviewDecision(
    createDemoReviewSession(scope),
    scope,
    editedField.id,
    {
      status: "edited",
      editedValue: { type: "number", value: 1250 },
    }
  );
  session = setDemoReviewDecision(session, scope, approvedField.id, {
    status: "approved",
    editedValue: null,
  });
  session = setDemoReviewDecision(session, scope, rejectedField.id, {
    status: "rejected",
    editedValue: null,
  });

  const projection = projectDashboardData(validation, session.reviews);
  const indicators = projection.categories.flatMap(
    ({ indicators: categoryIndicators }) => categoryIndicators
  );
  const edited = indicators.find(({ id }) => id === editedField.id);
  const rejected = indicators.find(({ id }) => id === rejectedField.id);

  assert.equal(projection.found, 12);
  assert.equal(projection.notFound, 0);
  assert.equal(projection.edited, 1);
  assert.equal(projection.approved, 1);
  assert.equal(projection.rejected, 1);
  assert.equal(projection.pending, 9);
  assert.equal(projection.temporaryDecisionCount, 3);
  assert.equal(edited?.displayValue, "1,250");
  assert.equal(edited?.sourceDisplayValue, "1,240");
  assert.equal(edited?.unit, "MWh");
  assert.equal(edited?.reviewStatus, "edited");
  assert.equal(edited?.isTemporary, true);
  assert.equal(rejected?.reviewStatus, "rejected");
  assert.equal(rejected?.displayValue, rejected?.sourceDisplayValue);
  assert.equal(rejected?.isTemporary, true);
  assert.deepEqual(editedField.value, originalValue);
  assert.deepEqual(editedField.evidence, originalEvidence);
});

test("accepts only one valid document UUID query value", () => {
  assert.equal(parseValidationDocumentId(DOCUMENT_ID), DOCUMENT_ID);
  assert.equal(parseValidationDocumentId(undefined), null);
  assert.equal(parseValidationDocumentId("not-a-uuid"), null);
  assert.equal(parseValidationDocumentId([DOCUMENT_ID, DOCUMENT_ID]), null);
});
