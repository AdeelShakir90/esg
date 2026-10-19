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
  type DemoReviewDecision,
  type DemoReviewState,
} from "./validation-review";

export const DASHBOARD_CATEGORIES = [
  "environmental",
  "social",
  "governance",
] as const satisfies readonly EsgCategory[];

export type DashboardIndicator = {
  id: string;
  key: EsgFieldKey;
  label: string;
  category: EsgCategory;
  extractionStatus: ValidationField["status"];
  reviewStatus: ValidationField["validationStatus"];
  isTemporary: boolean;
  sourceValue: EsgFieldValue | null;
  sourceDisplayValue: string;
  effectiveValue: EsgFieldValue | null;
  displayValue: string;
  unit: string | null;
  reportingPeriod: string | null;
  confidence: string | null;
  evidence: ValidationField["evidence"];
};

export type DashboardCategoryProjection = {
  category: EsgCategory;
  total: number;
  found: number;
  notFound: number;
  indicators: DashboardIndicator[];
};

export type DashboardProjection = {
  document: ValidationData["document"];
  extraction: ValidationData["extraction"];
  total: number;
  found: number;
  notFound: number;
  pending: number;
  approved: number;
  edited: number;
  rejected: number;
  temporaryDecisionCount: number;
  categories: DashboardCategoryProjection[];
};

function formatValue(value: EsgFieldValue | null) {
  if (!value) return "Not found";
  if (value.type === "boolean") return value.value ? "Yes" : "No";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 3,
  }).format(value.value);
}

function toIndicator(
  field: ValidationField,
  decision: DemoReviewDecision | undefined
): DashboardIndicator {
  const sourceValue = field.status === "found" ? field.value : null;
  const effectiveReview = getEffectiveDemoReview(field, decision);
  const effectiveValue = effectiveReview.value;

  return {
    id: field.id,
    key: field.key,
    label: field.label,
    category: field.category,
    extractionStatus: field.status,
    reviewStatus: effectiveReview.status,
    isTemporary: effectiveReview.isTemporary,
    sourceValue,
    sourceDisplayValue: formatValue(sourceValue),
    effectiveValue,
    displayValue: formatValue(effectiveValue),
    unit: effectiveValue ? field.unit : null,
    reportingPeriod: formatReportingPeriod(field),
    confidence: formatConfidence(field.confidence),
    evidence: field.evidence,
  };
}

export function projectDashboardData(
  validation: ValidationData,
  reviews: DemoReviewState = {}
): DashboardProjection {
  const fieldByKey = new Map(validation.fields.map((field) => [field.key, field]));

  if (
    validation.fields.length !== ESG_FIELD_DEFINITIONS.length ||
    fieldByKey.size !== ESG_FIELD_DEFINITIONS.length
  ) {
    throw new Error("Dashboard data requires 12 unique ESG fields.");
  }

  const indicators = ESG_FIELD_DEFINITIONS.map((definition) => {
    const field = fieldByKey.get(definition.key);
    if (!field || field.category !== definition.category) {
      throw new Error(`Dashboard data is missing ${definition.key}.`);
    }
    return toIndicator(field, reviews[field.id]);
  });

  const categories = DASHBOARD_CATEGORIES.map((category) => {
    const categoryIndicators = indicators.filter(
      (indicator) => indicator.category === category
    );
    const found = categoryIndicators.filter(
      (indicator) => indicator.extractionStatus === "found"
    ).length;

    return {
      category,
      total: categoryIndicators.length,
      found,
      notFound: categoryIndicators.length - found,
      indicators: categoryIndicators,
    };
  });

  const found = indicators.filter(
    (indicator) => indicator.extractionStatus === "found"
  ).length;

  return {
    document: validation.document,
    extraction: validation.extraction,
    total: indicators.length,
    found,
    notFound: indicators.length - found,
    pending: indicators.filter(
      (indicator) => indicator.reviewStatus === "pending"
    ).length,
    approved: indicators.filter(
      (indicator) => indicator.reviewStatus === "approved"
    ).length,
    edited: indicators.filter(
      (indicator) => indicator.reviewStatus === "edited"
    ).length,
    rejected: indicators.filter(
      (indicator) => indicator.reviewStatus === "rejected"
    ).length,
    temporaryDecisionCount: indicators.filter(
      (indicator) => indicator.isTemporary
    ).length,
    categories,
  };
}
