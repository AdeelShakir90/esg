import { z } from "zod";

const GeminiTransportFieldSchema = z
  .object({
    key: z.string(),
    label: z.string(),
    category: z.string(),
    status: z.string(),
    value_kind: z.enum(["none", "number", "integer", "boolean"]),
    number_value: z.number(),
    integer_value: z.number().int(),
    boolean_value: z.boolean(),
    unit_present: z.boolean(),
    unit: z.string(),
    period_label_present: z.boolean(),
    period_label: z.string(),
    period_start_present: z.boolean(),
    period_start: z.string(),
    period_end_present: z.boolean(),
    period_end: z.string(),
    confidence_present: z.boolean(),
    confidence: z.number(),
    evidence_quote_present: z.boolean(),
    evidence_quote: z.string(),
  })
  .strict();

export const GeminiEsgTransportOutputSchema = z
  .object({
    fields: z.array(GeminiTransportFieldSchema),
  })
  .strict();

export type GeminiEsgTransportOutput = z.infer<
  typeof GeminiEsgTransportOutputSchema
>;

export function createGeminiEsgResponseJsonSchema() {
  const fieldProperties = {
    key: { type: "string" },
    label: { type: "string" },
    category: { type: "string" },
    status: { type: "string" },
    value_kind: { type: "string" },
    number_value: { type: "number" },
    integer_value: { type: "integer" },
    boolean_value: { type: "boolean" },
    unit_present: { type: "boolean" },
    unit: { type: "string" },
    period_label_present: { type: "boolean" },
    period_label: { type: "string" },
    period_start_present: { type: "boolean" },
    period_start: { type: "string" },
    period_end_present: { type: "boolean" },
    period_end: { type: "string" },
    confidence_present: { type: "boolean" },
    confidence: { type: "number" },
    evidence_quote_present: { type: "boolean" },
    evidence_quote: { type: "string" },
  };

  return {
    type: "object",
    properties: {
      fields: {
        type: "array",
        items: {
          type: "object",
          properties: fieldProperties,
          required: Object.keys(fieldProperties),
        },
      },
    },
    required: ["fields"],
  };
}
