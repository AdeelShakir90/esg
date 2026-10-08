import assert from "node:assert/strict";
import test from "node:test";

import type { ValidationField } from "./validation";
import {
  createDemoReviewSession,
  getDemoReviewScope,
  getDemoReviewSummary,
  getEffectiveDemoReview,
  getScopedDemoReviews,
  parseDemoEditedValue,
  resetDemoReviewDecision,
  setDemoReviewDecision,
} from "./validation-review";

const FIELD_ID = "10000000-0000-4000-8000-000000000001";

function field(overrides: Partial<ValidationField> = {}): ValidationField {
  return {
    id: FIELD_ID,
    key: "electricity_consumption",
    label: "Electricity consumption",
    category: "environmental",
    status: "found",
    value: { type: "number", value: 1240 },
    unit: "MWh",
    reportingPeriod: { label: "2024", start: null, end: null },
    confidence: 0.95,
    evidence: { quote: "Synthetic evidence", page: null },
    validationStatus: "pending",
    validatedValue: null,
    updatedAt: "2026-10-08T00:00:00.000Z",
    ...overrides,
  };
}

test("applies approve, reject, edit, and reset transitions without mutating source data", () => {
  const source = field();
  const scope = getDemoReviewScope("document-a", "extraction-a");
  let session = createDemoReviewSession(scope);

  session = setDemoReviewDecision(session, scope, source.id, {
    status: "approved",
    editedValue: null,
  });
  assert.equal(getEffectiveDemoReview(source, session.reviews[source.id]).status, "approved");

  session = setDemoReviewDecision(session, scope, source.id, {
    status: "rejected",
    editedValue: null,
  });
  assert.equal(getEffectiveDemoReview(source, session.reviews[source.id]).status, "rejected");

  session = setDemoReviewDecision(session, scope, source.id, {
    status: "edited",
    editedValue: { type: "number", value: 1250 },
  });
  assert.deepEqual(getEffectiveDemoReview(source, session.reviews[source.id]).value, {
    type: "number",
    value: 1250,
  });
  assert.deepEqual(source.value, { type: "number", value: 1240 });

  session = resetDemoReviewDecision(session, scope, source.id);
  assert.equal(session.reviews[source.id], undefined);
  assert.equal(getEffectiveDemoReview(source, undefined).status, "pending");
});

test("validates numeric, integer, percentage, and boolean edits", () => {
  assert.deepEqual(parseDemoEditedValue("electricity_consumption", "12.5"), {
    success: true,
    value: { type: "number", value: 12.5 },
  });
  assert.equal(parseDemoEditedValue("electricity_consumption", "-1").success, false);

  assert.deepEqual(parseDemoEditedValue("employee_count", "165"), {
    success: true,
    value: { type: "integer", value: 165 },
  });
  assert.equal(parseDemoEditedValue("employee_count", "165.5").success, false);

  assert.deepEqual(parseDemoEditedValue("renewable_electricity_share", "68"), {
    success: true,
    value: { type: "number", value: 68 },
  });
  assert.equal(
    parseDemoEditedValue("renewable_electricity_share", "100.1").success,
    false
  );

  assert.deepEqual(parseDemoEditedValue("anti_corruption_policy", true), {
    success: true,
    value: { type: "boolean", value: true },
  });
  assert.equal(parseDemoEditedValue("anti_corruption_policy", "true").success, false);
});

test("discards temporary decisions when the document or extraction scope changes", () => {
  const firstScope = getDemoReviewScope("document-a", "extraction-a");
  const nextExtractionScope = getDemoReviewScope("document-a", "extraction-b");
  const nextDocumentScope = getDemoReviewScope("document-b", "extraction-b");
  const firstSession = setDemoReviewDecision(
    createDemoReviewSession(firstScope),
    firstScope,
    FIELD_ID,
    { status: "approved", editedValue: null }
  );

  assert.equal(Object.keys(getScopedDemoReviews(firstSession, firstScope)).length, 1);
  assert.deepEqual(getScopedDemoReviews(firstSession, nextExtractionScope), {});
  assert.deepEqual(getScopedDemoReviews(firstSession, nextDocumentScope), {});

  const secondSession = setDemoReviewDecision(
    firstSession,
    nextExtractionScope,
    FIELD_ID,
    { status: "rejected", editedValue: null }
  );
  assert.equal(secondSession.scopeKey, nextExtractionScope);
  assert.equal(Object.keys(secondSession.reviews).length, 1);
  assert.equal(secondSession.reviews[FIELD_ID]?.status, "rejected");
});

test("summarizes effective backend and temporary review statuses", () => {
  const fields = [
    field(),
    field({ id: "10000000-0000-4000-8000-000000000002", validationStatus: "approved" }),
    field({ id: "10000000-0000-4000-8000-000000000003" }),
    field({ id: "10000000-0000-4000-8000-000000000004" }),
  ];
  const reviews = {
    [fields[0].id]: { status: "edited" as const, editedValue: { type: "number" as const, value: 5 } },
    [fields[2].id]: { status: "rejected" as const, editedValue: null },
  };

  assert.deepEqual(getDemoReviewSummary(fields, reviews), {
    total: 4,
    approved: 1,
    edited: 1,
    rejected: 1,
    pending: 1,
  });
});
