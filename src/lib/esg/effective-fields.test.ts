import assert from "node:assert/strict";
import test from "node:test";

import { ESG_FIELD_DEFINITIONS } from "./definitions";
import { projectEffectiveEsgFields } from "./effective-fields";
import type { ValidationData, ValidationField } from "./validation";

function makeField(
  definition: (typeof ESG_FIELD_DEFINITIONS)[number],
  index: number
): ValidationField {
  const value =
    definition.valueType === "boolean"
      ? ({ type: "boolean", value: true } as const)
      : definition.valueType === "integer"
        ? ({ type: "integer", value: 100 + index } as const)
        : ({ type: "number", value: 10 + index } as const);

  return {
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    key: definition.key,
    label: definition.label,
    category: definition.category,
    status: "found",
    value,
    unit: definition.valueType === "boolean" ? null : "unit",
    reportingPeriod: { label: "2026", start: null, end: null },
    confidence: 0.9,
    evidence: { quote: `Evidence ${index + 1}`, page: null },
    validationStatus: "pending",
    validatedValue: null,
    updatedAt: "2026-10-19T10:00:00.000Z",
  };
}

function makeValidation(): ValidationData {
  return {
    document: {
      id: "9c388a00-af6a-427e-a880-a1215e332267",
      fileName: "source.pdf",
    },
    extraction: {
      id: "d2a9f734-4d8e-460d-b416-5cdd4762ab2d",
      schemaVersion: "esg-core-v1",
      completedAt: "2026-10-19T10:00:00.000Z",
    },
    fields: ESG_FIELD_DEFINITIONS.map(makeField),
  };
}

test("projects all canonical fields while separating source and review counts", () => {
  const validation = makeValidation();
  const edited = validation.fields[0];
  const approved = validation.fields[1];
  const rejected = validation.fields[2];
  const missing = validation.fields[3];
  missing.status = "not_found";
  missing.value = null;
  missing.unit = null;
  missing.reportingPeriod = { label: null, start: null, end: null };
  missing.confidence = null;
  missing.evidence = { quote: null, page: null };
  const sourceValue = structuredClone(edited.value);
  const sourceEvidence = structuredClone(edited.evidence);

  const projection = projectEffectiveEsgFields(validation, {
    [edited.id]: {
      status: "edited",
      editedValue: { type: "number", value: 1250 },
    },
    [approved.id]: { status: "approved", editedValue: null },
    [rejected.id]: { status: "rejected", editedValue: null },
  });

  assert.equal(projection.fields.length, 12);
  assert.deepEqual(
    projection.fields.map((field) => field.key),
    ESG_FIELD_DEFINITIONS.map((definition) => definition.key)
  );
  assert.equal(projection.found, 11);
  assert.equal(projection.notFound, 1);
  assert.equal(projection.approved, 1);
  assert.equal(projection.edited, 1);
  assert.equal(projection.rejected, 1);
  assert.equal(projection.pending, 9);
  assert.equal(projection.temporaryDecisionCount, 3);
  assert.equal(projection.fields[0].displayValue, "1,250");
  assert.equal(projection.fields[0].disposition, "accepted");
  assert.equal(projection.fields[2].disposition, "rejected");
  assert.equal(projection.fields[3].disposition, "missing");
  assert.deepEqual(edited.value, sourceValue);
  assert.deepEqual(edited.evidence, sourceEvidence);
});

test("rejects incomplete and duplicate canonical field sets", () => {
  const missing = makeValidation();
  missing.fields.pop();
  assert.throws(
    () => projectEffectiveEsgFields(missing),
    /12 unique ESG fields/
  );

  const duplicate = makeValidation();
  duplicate.fields[11] = duplicate.fields[10];
  assert.throws(
    () => projectEffectiveEsgFields(duplicate),
    /12 unique ESG fields/
  );
});
