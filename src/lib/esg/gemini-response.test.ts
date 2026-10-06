import assert from "node:assert/strict";
import test from "node:test";

import { ESG_FIELD_DEFINITIONS } from "./definitions";
import { EsgExtractionError } from "./errors";
import { parseGeminiStructuredOutput } from "./gemini-response";
import {
  type EsgExtractionOutput,
  validateEsgExtractionOutput,
} from "./schema";

type Definition = (typeof ESG_FIELD_DEFINITIONS)[number];

function transportField(definition: Definition) {
  return {
    key: definition.key,
    label: definition.label,
    category: definition.category,
    status: "not_found",
    value_kind: "none",
    number_value: 999.5,
    integer_value: 999,
    boolean_value: true,
    unit_present: false,
    unit: "ignored unit",
    period_label_present: false,
    period_label: "ignored period",
    period_start_present: false,
    period_start: "ignored start",
    period_end_present: false,
    period_end: "ignored end",
    confidence_present: false,
    confidence: 0.99,
    evidence_quote_present: false,
    evidence_quote: "ignored evidence",
  };
}

function validTransport() {
  return { fields: ESG_FIELD_DEFINITIONS.map(transportField) };
}

function parseTransport(transport: unknown) {
  return parseGeminiStructuredOutput(
    JSON.stringify(transport)
  ) as EsgExtractionOutput;
}

function foundTransport(
  definition: Definition,
  overrides: Partial<ReturnType<typeof transportField>>
) {
  return {
    ...transportField(definition),
    status: "found",
    confidence_present: true,
    confidence: 0.95,
    evidence_quote_present: true,
    evidence_quote: `Evidence for ${definition.label}`,
    ...overrides,
  };
}

test("normalizes number, integer, boolean, and none values", () => {
  const transport = validTransport();
  transport.fields[0] = foundTransport(ESG_FIELD_DEFINITIONS[0], {
    value_kind: "number",
    number_value: 1240,
  });
  transport.fields[8] = foundTransport(ESG_FIELD_DEFINITIONS[8], {
    value_kind: "integer",
    integer_value: 165,
  });
  transport.fields[10] = foundTransport(ESG_FIELD_DEFINITIONS[10], {
    value_kind: "boolean",
    boolean_value: false,
  });

  const output = parseTransport(transport);

  assert.deepEqual(output.fields[0].value, { type: "number", value: 1240 });
  assert.deepEqual(output.fields[8].value, { type: "integer", value: 165 });
  assert.deepEqual(output.fields[10].value, {
    type: "boolean",
    value: false,
  });
  assert.equal(output.fields[1].value, null);
});

test("ignores inactive value placeholders", () => {
  const transport = validTransport();
  transport.fields[0] = foundTransport(ESG_FIELD_DEFINITIONS[0], {
    value_kind: "number",
    number_value: 1240,
    integer_value: 777,
    boolean_value: true,
  });

  assert.deepEqual(parseTransport(transport).fields[0].value, {
    type: "number",
    value: 1240,
  });
});

test("maps presence flags and always sets evidence page to null", () => {
  const transport = validTransport();
  transport.fields[0] = foundTransport(ESG_FIELD_DEFINITIONS[0], {
    value_kind: "number",
    number_value: 1240,
    unit_present: true,
    unit: "MWh",
    period_label_present: true,
    period_label: "2026",
    period_start_present: true,
    period_start: "2026-01-01",
    period_end_present: true,
    period_end: "2026-12-31",
  });

  const output = parseTransport(transport);
  const present = output.fields[0];
  const absent = output.fields[1];

  assert.equal(present.unit, "MWh");
  assert.deepEqual(present.reporting_period, {
    label: "2026",
    start: "2026-01-01",
    end: "2026-12-31",
  });
  assert.equal(present.confidence, 0.95);
  assert.equal(present.evidence.quote, "Evidence for Electricity consumption");
  assert.equal(present.evidence.page, null);

  assert.equal(absent.unit, null);
  assert.deepEqual(absent.reporting_period, {
    label: null,
    start: null,
    end: null,
  });
  assert.equal(absent.confidence, null);
  assert.equal(absent.evidence.quote, null);
  assert.equal(absent.evidence.page, null);
});

test("normalizes a complete transport response for authoritative validation", () => {
  const transport = validTransport();
  transport.fields[0] = foundTransport(ESG_FIELD_DEFINITIONS[0], {
    value_kind: "number",
    number_value: 1240,
    unit_present: true,
    unit: "MWh",
  });
  transport.fields[8] = foundTransport(ESG_FIELD_DEFINITIONS[8], {
    value_kind: "integer",
    integer_value: 165,
    unit_present: true,
    unit: "employees",
  });
  transport.fields[10] = foundTransport(ESG_FIELD_DEFINITIONS[10], {
    value_kind: "boolean",
    boolean_value: true,
  });

  const parsed = validateEsgExtractionOutput(parseTransport(transport));
  assert.equal(parsed.fields.length, ESG_FIELD_DEFINITIONS.length);
});

test("leaves business rules to the authoritative application validation", () => {
  const missing = validTransport();
  missing.fields.pop();
  assert.throws(() => validateEsgExtractionOutput(parseTransport(missing)));

  const duplicate = validTransport();
  duplicate.fields[11] = { ...duplicate.fields[10] };
  assert.throws(() => validateEsgExtractionOutput(parseTransport(duplicate)));

  const invalidKey = validTransport() as {
    fields: Array<Record<string, unknown>>;
  };
  invalidKey.fields[0].key = "unsupported_field";
  assert.throws(() => validateEsgExtractionOutput(parseTransport(invalidKey)));

  const wrongCategory = validTransport();
  wrongCategory.fields[0] = {
    ...wrongCategory.fields[0],
    category: "social",
  };
  assert.throws(() => validateEsgExtractionOutput(parseTransport(wrongCategory)));

  const invalidStatus = validTransport();
  invalidStatus.fields[0] = {
    ...invalidStatus.fields[0],
    status: "unknown",
  };
  assert.throws(() => validateEsgExtractionOutput(parseTransport(invalidStatus)));

  const wrongValueType = validTransport();
  wrongValueType.fields[0] = foundTransport(ESG_FIELD_DEFINITIONS[0], {
    value_kind: "boolean",
    boolean_value: true,
  });
  assert.throws(() => validateEsgExtractionOutput(parseTransport(wrongValueType)));

  const inconsistentNotFound = validTransport();
  inconsistentNotFound.fields[0] = {
    ...inconsistentNotFound.fields[0],
    value_kind: "number",
    number_value: 1240,
  };
  assert.throws(() =>
    validateEsgExtractionOutput(parseTransport(inconsistentNotFound))
  );

  const invalidConfidence = validTransport();
  invalidConfidence.fields[0] = foundTransport(ESG_FIELD_DEFINITIONS[0], {
    value_kind: "number",
    number_value: 1240,
    confidence: 1.5,
  });
  assert.throws(() =>
    validateEsgExtractionOutput(parseTransport(invalidConfidence))
  );

  const withPage = parseTransport(validTransport()) as unknown as {
    fields: Array<{ evidence: { quote: string | null; page: number | null } }>;
  };
  withPage.fields[0].evidence.page = 1;
  assert.throws(() => validateEsgExtractionOutput(withPage));
});

test("rejects malformed Gemini transport output", () => {
  const missingProperty = validTransport() as {
    fields: Array<Record<string, unknown>>;
  };
  delete missingProperty.fields[0].unit_present;

  const wrongPrimitive = validTransport();
  const invalidValueKind = validTransport();

  for (const malformed of [
    missingProperty,
    { ...wrongPrimitive, fields: [{ ...wrongPrimitive.fields[0], unit: 12 }] },
    {
      ...invalidValueKind,
      fields: [
        { ...invalidValueKind.fields[0], value_kind: "string" },
        ...invalidValueKind.fields.slice(1),
      ],
    },
  ]) {
    assert.throws(
      () => parseTransport(malformed),
      (error) =>
        error instanceof EsgExtractionError && error.code === "invalid_output"
    );
  }
});

test("rejects missing or malformed Gemini structured output", () => {
  for (const response of [undefined, "", "not-json"]) {
    assert.throws(
      () => parseGeminiStructuredOutput(response),
      (error) =>
        error instanceof EsgExtractionError && error.code === "invalid_output"
    );
  }
});
