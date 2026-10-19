import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { ESG_FIELD_DEFINITIONS } from "./definitions";
import { createEsgReportSnapshot } from "./report-export";
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
          ? { type: "integer", value: 165 }
          : { type: "number", value: 100 + index },
    unit: definition.valueType === "boolean" ? null : "unit",
    reportingPeriod: { label: "2026", start: null, end: null },
    confidence: 0.9,
    evidence: {
      quote: `Fictional source evidence ${index + 1}. ${"Long evidence remains readable. ".repeat(12)}`,
      page: null,
    },
    validationStatus: "pending",
    validatedValue: null,
    updatedAt: "2026-10-19T10:00:00.000Z",
  };
}

function makeValidation(): ValidationData {
  const fields = ESG_FIELD_DEFINITIONS.map(makeField);
  fields[0].value = { type: "number", value: 1240 };
  fields[0].unit = "MWh";
  fields[3].status = "not_found";
  fields[3].value = null;
  fields[3].unit = null;
  fields[3].confidence = null;
  fields[3].evidence = { quote: null, page: null };

  return {
    document: {
      id: "9c388a00-af6a-427e-a880-a1215e332267",
      fileName: `${"Fictional Austrian Sustainability Report ".repeat(5)}2026.pdf`,
    },
    extraction: {
      id: "d2a9f734-4d8e-460d-b416-5cdd4762ab2d",
      schemaVersion: "esg-core-v1",
      completedAt: "2026-10-19T10:00:00.000Z",
    },
    fields,
  };
}

test("renders a multi-page PDF from one immutable fictional report snapshot", async () => {
  const validation = makeValidation();
  const report = projectEsgReport(
    validation,
    {
      [validation.fields[0].id]: {
        status: "edited",
        editedValue: { type: "number", value: 1250 },
      },
      [validation.fields[1].id]: {
        status: "approved",
        editedValue: null,
      },
      [validation.fields[2].id]: {
        status: "rejected",
        editedValue: null,
      },
    },
    "2026-10-19T11:00:00.000Z"
  );
  const snapshot = createEsgReportSnapshot(
    report,
    "2026-10-19T12:34:56.000Z"
  );

  const nativeImport = new Function(
    "specifier",
    "return import(specifier)"
  ) as (specifier: string) => Promise<unknown>;
  const { renderToBuffer } = (await nativeImport(
    "@react-pdf/renderer"
  )) as typeof import("@react-pdf/renderer");
  const { EsgReportPdfDocument } = (await nativeImport(
    pathToFileURL(
      resolve("src/components/reports/report-pdf-document.tsx")
    ).href
  )) as typeof import("../../components/reports/report-pdf-document");
  const output = await renderToBuffer(
    EsgReportPdfDocument({ report: snapshot })
  );

  assert.equal(output.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.ok(output.length > 20_000);
  assert.equal(
    output.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length,
    8
  );
  assert.equal(snapshot.fields.length, 12);
  assert.equal(snapshot.fields[0].displayValue, "1,250");
  assert.equal(snapshot.fields[0].sourceDisplayValue, "1,240");
  assert.equal(snapshot.acceptedFindings.some((field) => field.id === validation.fields[2].id), false);

  if (process.env.WRITE_PDF_FIXTURE === "true") {
    const outputDirectory = resolve("tmp/pdfs");
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(resolve(outputDirectory, "step6c-fictional-report.pdf"), output);
  }
});
