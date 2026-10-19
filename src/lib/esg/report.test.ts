import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ESG_FIELD_DEFINITIONS } from "./definitions";
import { projectEsgReport, REPORT_DISCLAIMER } from "./report";
import type { ValidationData, ValidationField } from "./validation";
import {
  createDemoReviewSession,
  getDemoReviewScope,
  getScopedDemoReviews,
  setDemoReviewDecision,
} from "./validation-review";

const DOCUMENT_ID = "9c388a00-af6a-427e-a880-a1215e332267";
const EXTRACTION_ID = "d2a9f734-4d8e-460d-b416-5cdd4762ab2d";

function makeField(
  definition: (typeof ESG_FIELD_DEFINITIONS)[number],
  index: number
): ValidationField {
  return {
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    key: definition.key,
    label: definition.label,
    category: definition.category,
    status: "found",
    value:
      definition.valueType === "boolean"
        ? { type: "boolean", value: true }
        : definition.valueType === "integer"
          ? { type: "integer", value: 100 + index }
          : { type: "number", value: 10 + index },
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
    document: { id: DOCUMENT_ID, fileName: "source.pdf" },
    extraction: {
      id: EXTRACTION_ID,
      schemaVersion: "esg-core-v1",
      completedAt: "2026-10-19T10:00:00.000Z",
    },
    fields: ESG_FIELD_DEFINITIONS.map(makeField),
  };
}

test("groups exactly 12 canonical indicators without accepting pending findings", () => {
  const report = projectEsgReport(
    makeValidation(),
    {},
    "2026-10-19T12:00:00.000Z"
  );

  assert.equal(report.total, 12);
  assert.deepEqual(
    report.sections.map((section) => [section.category, section.fields.length]),
    [
      ["environmental", 8],
      ["social", 2],
      ["governance", 2],
    ]
  );
  assert.equal(report.acceptedFindings.length, 0);
  assert.equal(report.attentionFields.length, 12);
  assert.equal(report.pending, 12);
  assert.equal(report.commonReportingPeriod, "2026");
  assert.equal(report.disclaimer, REPORT_DISCLAIMER);
});

test("preserves source data while applying scoped edits and excluding rejections", () => {
  const validation = makeValidation();
  const edited = validation.fields[0];
  edited.value = { type: "number", value: 1240 };
  edited.unit = "MWh";
  const approved = validation.fields[1];
  const rejected = validation.fields[2];
  const missing = validation.fields[3];
  missing.status = "not_found";
  missing.value = null;
  missing.unit = null;
  missing.reportingPeriod = { label: null, start: null, end: null };
  missing.confidence = null;
  missing.evidence = { quote: null, page: null };
  const originalValue = structuredClone(edited.value);
  const originalEvidence = structuredClone(edited.evidence);
  const scope = getDemoReviewScope(DOCUMENT_ID, EXTRACTION_ID);
  let session = setDemoReviewDecision(
    createDemoReviewSession(scope),
    scope,
    edited.id,
    { status: "edited", editedValue: { type: "number", value: 1250 } }
  );
  session = setDemoReviewDecision(session, scope, approved.id, {
    status: "approved",
    editedValue: null,
  });
  session = setDemoReviewDecision(session, scope, rejected.id, {
    status: "rejected",
    editedValue: null,
  });

  const report = projectEsgReport(
    validation,
    getScopedDemoReviews(session, scope),
    "2026-10-19T12:00:00.000Z"
  );
  const editedReportField = report.fields.find((field) => field.id === edited.id);

  assert.equal(editedReportField?.displayValue, "1,250");
  assert.equal(editedReportField?.sourceDisplayValue, "1,240");
  assert.equal(report.acceptedFindings.length, 2);
  assert.equal(
    report.acceptedFindings.some((field) => field.id === rejected.id),
    false
  );
  assert.equal(report.attentionFields.some((field) => field.id === rejected.id), true);
  assert.equal(report.attentionFields.some((field) => field.id === missing.id), true);
  assert.equal(report.found, 11);
  assert.equal(report.notFound, 1);
  assert.equal(report.approved, 1);
  assert.equal(report.edited, 1);
  assert.equal(report.rejected, 1);
  assert.deepEqual(edited.value, originalValue);
  assert.deepEqual(edited.evidence, originalEvidence);
});

test("does not apply decisions from another document or extraction scope", () => {
  const validation = makeValidation();
  const field = validation.fields[0];
  const otherScope = getDemoReviewScope("document-b", "extraction-b");
  const session = setDemoReviewDecision(
    createDemoReviewSession(otherScope),
    otherScope,
    field.id,
    { status: "edited", editedValue: { type: "number", value: 999 } }
  );
  const currentScope = getDemoReviewScope(DOCUMENT_ID, EXTRACTION_ID);
  const report = projectEsgReport(
    validation,
    getScopedDemoReviews(session, currentScope),
    "2026-10-19T12:00:00.000Z"
  );

  assert.equal(report.fields[0].displayValue, "10");
  assert.equal(report.fields[0].reviewStatus, "pending");
});

test("uses a report-wide period only when supported periods are consistent", () => {
  const mixed = makeValidation();
  mixed.fields[0].reportingPeriod.label = "2025";
  const mixedReport = projectEsgReport(
    mixed,
    {},
    "2026-10-19T12:00:00.000Z"
  );
  assert.equal(mixedReport.commonReportingPeriod, null);
  assert.equal(mixedReport.hasMixedReportingPeriods, true);

  const missing = makeValidation();
  for (const field of missing.fields) {
    field.reportingPeriod = { label: null, start: null, end: null };
  }
  const missingReport = projectEsgReport(
    missing,
    {},
    "2026-10-19T12:00:00.000Z"
  );
  assert.equal(missingReport.commonReportingPeriod, null);
  assert.equal(missingReport.hasMixedReportingPeriods, false);
});

test("reports page contains no fictional report fallback or compliance conclusion", () => {
  const source = readFileSync(
    new URL("../../app/(authenticated)/reports/page.tsx", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(
    source,
    /GreenVolt|Alpine Supply|FreshBite|NovaElectra|UrbanNest|above benchmark/
  );
  assert.doesNotMatch(source, /demoReports|mockReports/);
});
