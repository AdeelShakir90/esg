import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { ESG_FIELD_DEFINITIONS } from "./definitions";
import { createEsgReportSnapshot } from "./report-export";
import { projectEsgReport } from "./report";
import type { DemoReviewState } from "./validation-review";
import type { ValidationData, ValidationField } from "./validation";

const A4_HEIGHT_POINTS = 841.89;
const nativeImport = new Function(
  "specifier",
  "return import(specifier)"
) as (specifier: string) => Promise<unknown>;

async function loadPdfDocumentModule() {
  const { build } = (await nativeImport("esbuild")) as typeof import("esbuild");
  const temporaryRoot = resolve("tmp");
  await mkdir(temporaryRoot, { recursive: true });
  const temporaryDirectory = await mkdtemp(
    join(temporaryRoot, "envario-report-pdf-test-")
  );
  const outputPath = join(temporaryDirectory, "report-pdf-document.mjs");

  try {
    await build({
      bundle: true,
      entryPoints: [resolve("src/components/reports/report-pdf-document.tsx")],
      format: "esm",
      outfile: outputPath,
      packages: "external",
      platform: "node",
      target: "node22",
    });
    return (await nativeImport(
      pathToFileURL(outputPath).href
    )) as typeof import("../../components/reports/report-pdf-document");
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

const pdfDocumentModulePromise = loadPdfDocumentModule();

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

async function renderReport(validation: ValidationData, reviews: DemoReviewState) {
  const report = projectEsgReport(
    validation,
    reviews,
    "2026-10-19T11:00:00.000Z"
  );
  const snapshot = createEsgReportSnapshot(
    report,
    "2026-10-19T12:34:56.000Z"
  );
  const { Font, renderToBuffer } = (await nativeImport(
    "@react-pdf/renderer"
  )) as typeof import("@react-pdf/renderer");
  const { EsgReportPdfDocument } = await pdfDocumentModulePromise;

  const fontBaseUrl = resolve("public/fonts/noto-sans");
  Font.register({
    family: "Noto Sans",
    fonts: [
      { src: `${fontBaseUrl}/NotoSans-Regular.ttf`, fontWeight: 400 },
      { src: `${fontBaseUrl}/NotoSans-Bold.ttf`, fontWeight: 700 },
    ],
  });
  Font.register({
    family: "Noto Sans Math",
    src: `${fontBaseUrl}/NotoSansMath-Regular.ttf`,
    fontWeight: 400,
  });
  Font.registerHyphenationCallback((word) => [word]);

  const output = await renderToBuffer(
    EsgReportPdfDocument({ report: snapshot })
  );
  const { extractText, extractTextItems, getDocumentProxy } = (await nativeImport(
    "unpdf"
  )) as typeof import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(output));
  const [{ text, totalPages }, { items }] = await Promise.all([
    extractText(pdf),
    extractTextItems(pdf),
  ]);
  await pdf.cleanup();

  return { items, output, pageTexts: text, snapshot, totalPages };
}

function assertEveryPhysicalPageIsFramed(
  pageTexts: string[],
  items: Awaited<ReturnType<typeof import("unpdf")["extractTextItems"]>>["items"]
) {
  const totalPages = pageTexts.length;

  pageTexts.forEach((text, index) => {
    assert.match(text, new RegExp(`Page ${index + 1} of ${totalPages}`));
    assert.match(text, /not certified/i);
    if (index > 0) assert.match(text, /envario/);

    for (const item of items[index]) {
      assert.ok(item.y >= 16, `Page ${index + 1} text fell below the footer: ${item.str}`);
      assert.ok(
        item.y + item.height <= A4_HEIGHT_POINTS - 16,
        `Page ${index + 1} text exceeded the top boundary: ${item.str}`
      );
    }
  });
}

test("renders pending and mixed review reports with dynamic page framing", async () => {
  const pendingValidation = makeValidation();
  const pending = await renderReport(pendingValidation, {});
  assert.equal(pending.snapshot.pending, 12);
  assert.equal(pending.snapshot.notFound, 1);
  assertEveryPhysicalPageIsFramed(pending.pageTexts, pending.items);

  const mixedValidation = makeValidation();
  const mixed = await renderReport(mixedValidation, {
    [mixedValidation.fields[0].id]: {
      status: "edited",
      editedValue: { type: "number", value: 1250 },
    },
    [mixedValidation.fields[1].id]: {
      status: "approved",
      editedValue: null,
    },
    [mixedValidation.fields[2].id]: {
      status: "rejected",
      editedValue: null,
    },
  });

  assert.equal(mixed.output.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.ok(mixed.output.length > 20_000);
  assert.equal(mixed.snapshot.fields.length, 12);
  assert.equal(mixed.snapshot.fields[0].displayValue, "1,250");
  assert.equal(mixed.snapshot.fields[0].sourceDisplayValue, "1,240");
  assert.equal(
    mixed.snapshot.acceptedFindings.some(
      (field) => field.id === mixedValidation.fields[2].id
    ),
    false
  );
  assert.match(mixed.pageTexts.join("\n"), /Original AI value:\s*1,240/);
  assertEveryPhysicalPageIsFramed(mixed.pageTexts, mixed.items);

  if (process.env.WRITE_PDF_FIXTURE === "true") {
    const outputDirectory = resolve("tmp/pdfs");
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(resolve(outputDirectory, "step6d-normal-report.pdf"), mixed.output);
  }
});

test("flows all 12 rejected indicators without clipping traceability content", async () => {
  const validation = makeValidation();
  validation.fields[3].status = "found";
  validation.fields[3].value = { type: "number", value: 82 };
  validation.fields[3].unit = "tCO2e";
  validation.fields[3].confidence = 0.9;
  validation.fields[3].evidence = { quote: "Restored fictional evidence.", page: null };
  const reviews = Object.fromEntries(
    validation.fields.map((field) => [
      field.id,
      { status: "rejected", editedValue: null },
    ])
  ) as DemoReviewState;
  const rendered = await renderReport(validation, reviews);
  const text = rendered.pageTexts.join("\n");

  assert.equal(rendered.snapshot.rejected, 12);
  assert.equal(rendered.snapshot.acceptedFindings.length, 0);
  for (const definition of ESG_FIELD_DEFINITIONS) {
    assert.match(text, new RegExp(definition.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(text, /Limitations and disclaimer/);
  assert.match(text, /not certified/i);
  assertEveryPhysicalPageIsFramed(rendered.pageTexts, rendered.items);

  if (process.env.WRITE_PDF_FIXTURE === "true") {
    const outputDirectory = resolve("tmp/pdfs");
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(resolve(outputDirectory, "step6d-all-rejected-report.pdf"), rendered.output);
  }
});

test("preserves supported Unicode in the rendered and extracted PDF text", async () => {
  const validation = makeValidation();
  validation.document.fileName = "Nachhaltigkeitsbericht Österreich Straße 2026.pdf";
  validation.fields[0].evidence.quote =
    "Ärger, Öl, Übung, Straße; CO₂e; ± ≤ ≥; € £ ¥ ₽; → ✓; unsupported 😀 漢字 العربية.";
  const rendered = await renderReport(validation, {});
  const text = rendered.pageTexts.join("\n");

  if (process.env.WRITE_PDF_FIXTURE === "true") {
    const outputDirectory = resolve("tmp/pdfs");
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(resolve(outputDirectory, "step6d-unicode-report.pdf"), rendered.output);
  }

  assert.match(text, /Nachhaltigkeitsbericht Österreich Straße 2026\.pdf/);
  assert.match(text, /Ärger, Öl, Übung, Straße/);
  assert.match(text, /CO₂e/);
  assert.match(text, /± ≤ ≥/);
  assert.match(text, /€ £ ¥ ₽/);
  assert.match(text, /→ ✓/);
  assert.match(text, /unsupported.*�/);
  assert.match(
    text,
    /Unsupported\s+scripts\s+and\s+emoji[\s\S]{0,80}replacement\s+character/
  );
  assertEveryPhysicalPageIsFramed(rendered.pageTexts, rendered.items);

});
