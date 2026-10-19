import {
  ESG_FIELD_DEFINITIONS,
  type EsgCategory,
  type EsgFieldKey,
} from "./definitions";
import type { EsgFieldValue } from "./schema";
import type { ValidationData, ValidationField } from "./validation";
import { formatConfidence, formatReportingPeriod } from "./validation-format";
import {
  getEffectiveDemoReview,
  type DemoReviewState,
} from "./validation-review";

export type EffectiveFindingDisposition =
  | "accepted"
  | "unverified"
  | "rejected"
  | "missing";

export type EffectiveEsgField = {
  id: string;
  key: EsgFieldKey;
  label: string;
  category: EsgCategory;
  extractionStatus: ValidationField["status"];
  reviewStatus: ValidationField["validationStatus"];
  isTemporary: boolean;
  disposition: EffectiveFindingDisposition;
  sourceValue: EsgFieldValue | null;
  sourceDisplayValue: string;
  effectiveValue: EsgFieldValue | null;
  displayValue: string;
  unit: string | null;
  reportingPeriod: string | null;
  confidence: string | null;
  confidenceValue: number | null;
  evidence: ValidationField["evidence"];
};

export type EffectiveEsgProjection = {
  document: ValidationData["document"];
  extraction: ValidationData["extraction"];
  fields: EffectiveEsgField[];
  total: number;
  found: number;
  notFound: number;
  pending: number;
  approved: number;
  edited: number;
  rejected: number;
  temporaryDecisionCount: number;
};

export function formatEffectiveEsgValue(value: EsgFieldValue | null) {
  if (!value) return "Not found";
  if (value.type === "boolean") return value.value ? "Yes" : "No";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 3,
  }).format(value.value);
}

function getDisposition(
  status: ValidationField["validationStatus"],
  value: EsgFieldValue | null
): EffectiveFindingDisposition {
  if (status === "rejected") return "rejected";
  if (!value) return "missing";
  if (status === "approved" || status === "edited") return "accepted";
  return "unverified";
}

export function projectEffectiveEsgFields(
  validation: ValidationData,
  reviews: DemoReviewState = {}
): EffectiveEsgProjection {
  const fieldByKey = new Map(validation.fields.map((field) => [field.key, field]));

  if (
    validation.fields.length !== ESG_FIELD_DEFINITIONS.length ||
    fieldByKey.size !== ESG_FIELD_DEFINITIONS.length
  ) {
    throw new Error("Effective ESG data requires 12 unique ESG fields.");
  }

  const fields = ESG_FIELD_DEFINITIONS.map((definition) => {
    const field = fieldByKey.get(definition.key);
    if (!field || field.category !== definition.category) {
      throw new Error(`Effective ESG data is missing ${definition.key}.`);
    }

    const sourceValue = field.status === "found" ? field.value : null;
    const effectiveReview = getEffectiveDemoReview(field, reviews[field.id]);
    const effectiveValue = effectiveReview.value;

    return {
      id: field.id,
      key: field.key,
      label: field.label,
      category: field.category,
      extractionStatus: field.status,
      reviewStatus: effectiveReview.status,
      isTemporary: effectiveReview.isTemporary,
      disposition: getDisposition(effectiveReview.status, effectiveValue),
      sourceValue,
      sourceDisplayValue: formatEffectiveEsgValue(sourceValue),
      effectiveValue,
      displayValue: formatEffectiveEsgValue(effectiveValue),
      unit: effectiveValue ? field.unit : null,
      reportingPeriod: formatReportingPeriod(field),
      confidence: formatConfidence(field.confidence),
      confidenceValue: field.confidence,
      evidence: field.evidence,
    } satisfies EffectiveEsgField;
  });

  const found = fields.filter(
    (field) => field.extractionStatus === "found"
  ).length;

  return {
    document: validation.document,
    extraction: validation.extraction,
    fields,
    total: fields.length,
    found,
    notFound: fields.length - found,
    pending: fields.filter((field) => field.reviewStatus === "pending").length,
    approved: fields.filter((field) => field.reviewStatus === "approved").length,
    edited: fields.filter((field) => field.reviewStatus === "edited").length,
    rejected: fields.filter((field) => field.reviewStatus === "rejected").length,
    temporaryDecisionCount: fields.filter((field) => field.isTemporary).length,
  };
}
