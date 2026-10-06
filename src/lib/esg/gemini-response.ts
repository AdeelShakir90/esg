import { EsgExtractionError } from "./errors";
import {
  GeminiEsgTransportOutputSchema,
  type GeminiEsgTransportOutput,
} from "./gemini-schema";

type GeminiTransportField = GeminiEsgTransportOutput["fields"][number];

function invalidOutput(): never {
  throw new EsgExtractionError(
    "invalid_output",
    "The ESG extraction returned an invalid structured result.",
    502
  );
}

function normalizeValue(field: GeminiTransportField) {
  switch (field.value_kind) {
    case "number":
      return { type: "number" as const, value: field.number_value };
    case "integer":
      return { type: "integer" as const, value: field.integer_value };
    case "boolean":
      return { type: "boolean" as const, value: field.boolean_value };
    case "none":
      return null;
  }
}

function normalizeGeminiTransport(output: GeminiEsgTransportOutput) {
  return {
    fields: output.fields.map((field) => ({
      key: field.key,
      label: field.label,
      category: field.category,
      status: field.status,
      value: normalizeValue(field),
      unit: field.unit_present ? field.unit : null,
      reporting_period: {
        label: field.period_label_present ? field.period_label : null,
        start: field.period_start_present ? field.period_start : null,
        end: field.period_end_present ? field.period_end : null,
      },
      confidence: field.confidence_present ? field.confidence : null,
      evidence: {
        quote: field.evidence_quote_present ? field.evidence_quote : null,
        page: null,
      },
    })),
  };
}

export function parseGeminiStructuredOutput(responseText: unknown): unknown {
  if (typeof responseText !== "string" || !responseText.trim()) {
    throw new EsgExtractionError(
      "invalid_output",
      "The ESG extraction service returned no structured result.",
      502
    );
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(responseText);
  } catch {
    invalidOutput();
  }

  const transport = GeminiEsgTransportOutputSchema.safeParse(decoded);
  if (!transport.success) invalidOutput();

  return normalizeGeminiTransport(transport.data);
}
