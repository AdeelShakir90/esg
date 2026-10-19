import {
  ESG_FIELD_DEFINITIONS,
  type EsgCategory,
  type EsgFieldKey,
} from "./definitions";
import type { EsgFieldValue } from "./schema";
import type { ValidationData, ValidationField } from "./validation";
import { formatConfidence, formatReportingPeriod } from "./validation-format";

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
  validationStatus: ValidationField["validationStatus"];
  value: EsgFieldValue | null;
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
  categories: DashboardCategoryProjection[];
};

function formatValue(value: EsgFieldValue | null) {
  if (!value) return "Not found";
  if (value.type === "boolean") return value.value ? "Yes" : "No";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 3,
  }).format(value.value);
}

function toIndicator(field: ValidationField): DashboardIndicator {
  const value = field.status === "found" ? field.value : null;

  return {
    id: field.id,
    key: field.key,
    label: field.label,
    category: field.category,
    extractionStatus: field.status,
    validationStatus: field.validationStatus,
    value,
    displayValue: formatValue(value),
    unit: field.status === "found" ? field.unit : null,
    reportingPeriod: formatReportingPeriod(field),
    confidence: formatConfidence(field.confidence),
    evidence: field.evidence,
  };
}

export function projectDashboardData(
  validation: ValidationData
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
    return toIndicator(field);
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
      (indicator) => indicator.validationStatus === "pending"
    ).length,
    approved: indicators.filter(
      (indicator) => indicator.validationStatus === "approved"
    ).length,
    edited: indicators.filter(
      (indicator) => indicator.validationStatus === "edited"
    ).length,
    rejected: indicators.filter(
      (indicator) => indicator.validationStatus === "rejected"
    ).length,
    categories,
  };
}
