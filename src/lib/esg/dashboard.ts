import type { EsgCategory } from "./definitions";
import {
  projectEffectiveEsgFields,
  type EffectiveEsgField,
} from "./effective-fields";
import type { ValidationData } from "./validation";
import type { DemoReviewState } from "./validation-review";

export const DASHBOARD_CATEGORIES = [
  "environmental",
  "social",
  "governance",
] as const satisfies readonly EsgCategory[];

export type DashboardIndicator = EffectiveEsgField;

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

export function projectDashboardData(
  validation: ValidationData,
  reviews: DemoReviewState = {}
): DashboardProjection {
  const effective = projectEffectiveEsgFields(validation, reviews);
  const indicators = effective.fields;

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

  return {
    document: effective.document,
    extraction: effective.extraction,
    total: effective.total,
    found: effective.found,
    notFound: effective.notFound,
    pending: effective.pending,
    approved: effective.approved,
    edited: effective.edited,
    rejected: effective.rejected,
    temporaryDecisionCount: effective.temporaryDecisionCount,
    categories,
  };
}
