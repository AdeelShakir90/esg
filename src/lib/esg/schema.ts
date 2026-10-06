import { z } from "zod";

import {
  ESG_FIELD_DEFINITION_BY_KEY,
  ESG_FIELD_DEFINITIONS,
  ESG_FIELD_KEYS,
} from "./definitions";
import { EsgExtractionError } from "./errors";

const NumberValueSchema = z
  .object({
    type: z.literal("number"),
    value: z.number().finite().nonnegative(),
  })
  .strict();

const IntegerValueSchema = z
  .object({
    type: z.literal("integer"),
    value: z.number().int().nonnegative(),
  })
  .strict();

const BooleanValueSchema = z
  .object({
    type: z.literal("boolean"),
    value: z.boolean(),
  })
  .strict();

export const EsgFieldValueSchema = z.discriminatedUnion("type", [
  NumberValueSchema,
  IntegerValueSchema,
  BooleanValueSchema,
]);

const ReportingPeriodSchema = z
  .object({
    label: z.string().trim().min(1).max(100).nullable(),
    start: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    end: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
  })
  .strict();

const EvidenceSchema = z
  .object({
    quote: z.string().trim().min(1).max(500).nullable(),
    page: z.null(),
  })
  .strict();

export const EsgFieldSchema = z
  .object({
    key: z.enum(ESG_FIELD_KEYS),
    label: z.string().trim().min(1).max(100),
    category: z.enum(["environmental", "social", "governance"]),
    status: z.enum(["found", "not_found"]),
    value: EsgFieldValueSchema.nullable(),
    unit: z.string().trim().min(1).max(50).nullable(),
    reporting_period: ReportingPeriodSchema,
    confidence: z.number().min(0).max(1).nullable(),
    evidence: EvidenceSchema,
  })
  .strict();

export const EsgExtractionOutputSchema = z
  .object({
    fields: z.array(EsgFieldSchema).length(ESG_FIELD_DEFINITIONS.length),
  })
  .strict();

export type EsgFieldValue = z.infer<typeof EsgFieldValueSchema>;
export type ExtractedEsgField = z.infer<typeof EsgFieldSchema>;
export type EsgExtractionOutput = z.infer<typeof EsgExtractionOutputSchema>;

function invalidOutput(message: string): never {
  throw new EsgExtractionError("invalid_output", message, 502);
}

function periodIsEmpty(field: ExtractedEsgField) {
  return (
    field.reporting_period.label === null &&
    field.reporting_period.start === null &&
    field.reporting_period.end === null
  );
}

export function validateEsgExtractionOutput(input: unknown): EsgExtractionOutput {
  const parsed = EsgExtractionOutputSchema.safeParse(input);

  if (!parsed.success) {
    invalidOutput("The ESG extraction returned an invalid structured result.");
  }

  const keys = parsed.data.fields.map((field) => field.key);
  if (new Set(keys).size !== ESG_FIELD_DEFINITIONS.length) {
    invalidOutput("The ESG extraction returned duplicate or missing fields.");
  }

  for (const definition of ESG_FIELD_DEFINITIONS) {
    if (!keys.includes(definition.key)) {
      invalidOutput("The ESG extraction did not return every required field.");
    }
  }

  for (const field of parsed.data.fields) {
    const definition = ESG_FIELD_DEFINITION_BY_KEY.get(field.key);
    if (!definition) {
      invalidOutput("The ESG extraction returned an unsupported field.");
    }

    if (field.label !== definition.label || field.category !== definition.category) {
      invalidOutput("The ESG extraction returned incorrect field metadata.");
    }

    if (field.status === "not_found") {
      if (
        field.value !== null ||
        field.unit !== null ||
        field.confidence !== null ||
        field.evidence.quote !== null ||
        !periodIsEmpty(field)
      ) {
        invalidOutput("A field marked not found contained unsupported data.");
      }
      continue;
    }

    if (
      field.value === null ||
      field.confidence === null ||
      field.evidence.quote === null
    ) {
      invalidOutput("A found ESG field was missing its value, confidence, or evidence.");
    }

    if (field.value.type !== definition.valueType) {
      invalidOutput("An ESG field returned a value with the wrong type.");
    }

    if (
      "percentage" in definition &&
      definition.percentage &&
      field.value.type === "number" &&
      field.value.value > 100
    ) {
      invalidOutput("An ESG percentage was outside the supported range.");
    }

    if (definition.valueType === "boolean" && field.unit !== null) {
      invalidOutput("A boolean ESG field cannot have a unit.");
    }
  }

  return parsed.data;
}
