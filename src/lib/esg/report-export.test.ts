import assert from "node:assert/strict";
import test from "node:test";

import { ESG_FIELD_DEFINITIONS } from "./definitions";
import {
  createEsgReportFileName,
  createEsgReportSnapshot,
  formatReportTimestamp,
} from "./report-export";
import { projectEsgReport } from "./report";
import type { ValidationData, ValidationField } from "./validation";

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
    document: {
      id: "9c388a00-af6a-427e-a880-a1215e332267",
      fileName: "Sustainability Bericht Österreich 2026.pdf",
    },
    extraction: {
      id: "d2a9f734-4d8e-460d-b416-5cdd4762ab2d",
      schemaVersion: "esg-core-v1",
      completedAt: "2026-10-19T10:00:00.000Z",
    },
    fields: ESG_FIELD_DEFINITIONS.map(makeField),
  };
}

test("captures one deeply frozen report snapshot without mutating the projection", () => {
  const report = projectEsgReport(
    makeValidation(),
    {},
    "2026-10-19T11:00:00.000Z"
  );
  const snapshot = createEsgReportSnapshot(
    report,
    "2026-10-19T12:34:56.000Z"
  );

  report.document.fileName = "changed-after-click.pdf";
  report.fields[0].evidence.quote = "Changed after click";

  assert.equal(snapshot.generatedAt, "2026-10-19T12:34:56.000Z");
  assert.equal(
    snapshot.document.fileName,
    "Sustainability Bericht Österreich 2026.pdf"
  );
  assert.equal(snapshot.fields[0].evidence.quote, "Evidence 1");
  assert.equal(snapshot.fields.length, 12);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.fields), true);
  assert.equal(Object.isFrozen(snapshot.fields[0].evidence), true);
});

test("keeps edited and original values in the frozen snapshot", () => {
  const validation = makeValidation();
  const electricity = validation.fields[0];
  electricity.value = { type: "number", value: 1240 };
  electricity.unit = "MWh";
  const report = projectEsgReport(
    validation,
    {
      [electricity.id]: {
        status: "edited",
        editedValue: { type: "number", value: 1250 },
      },
    },
    "2026-10-19T11:00:00.000Z"
  );

  const snapshot = createEsgReportSnapshot(
    report,
    "2026-10-19T12:34:56.000Z"
  );

  assert.equal(snapshot.fields[0].displayValue, "1,250");
  assert.equal(snapshot.fields[0].sourceDisplayValue, "1,240");
  assert.equal(snapshot.fields[0].reviewStatus, "edited");
});

test("creates a bounded safe PDF filename from long and Unicode source names", () => {
  const fileName = createEsgReportFileName(
    `${"Äußerst langer Nachhaltigkeitsbericht ".repeat(8)}.pdf`,
    "2026-10-19T12:34:56.000Z"
  );

  assert.match(
    fileName,
    /^envario_draft_esg_report_[a-z0-9-]+_2026-10-19\.pdf$/
  );
  assert.ok(fileName.length < 100);
  assert.equal(fileName.includes(".."), false);
  assert.equal(fileName.includes("/"), false);
  assert.equal(fileName.includes("\\"), false);
});

test("uses the same explicit Vienna timestamp format for preview and PDF", () => {
  assert.equal(
    formatReportTimestamp("2026-10-19T12:34:56.000Z"),
    "19 Oct 2026, 14:34"
  );
  assert.throws(
    () => formatReportTimestamp("not-a-date"),
    /valid report timestamp/
  );
});
