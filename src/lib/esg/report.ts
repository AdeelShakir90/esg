import {
  projectEffectiveEsgFields,
  type EffectiveEsgField,
} from "./effective-fields";
import type { EsgCategory } from "./definitions";
import type { ValidationData } from "./validation";
import type { DemoReviewState } from "./validation-review";

export const REPORT_CATEGORY_LABELS = {
  environmental: "Environmental",
  social: "Social",
  governance: "Governance",
} as const satisfies Record<EsgCategory, string>;

export const REPORT_DISCLAIMER =
  "Draft ESG data report — not certified and not evidence of VSME, ESRS or regulatory compliance.";

export const REPORT_LIMITATIONS = [
  "This draft covers only the 12 canonical ESG indicators currently supported by the controlled MVP.",
  "AI-extracted values require human review and do not establish accuracy or completeness, regardless of model confidence.",
  "Temporary demo review decisions are held in browser memory and are not saved to Supabase.",
] as const;

export type ReportSection = {
  category: EsgCategory;
  label: string;
  fields: EffectiveEsgField[];
  accepted: number;
  unverified: number;
  rejected: number;
  missing: number;
};

export type EsgReportProjection = ReturnType<typeof projectEffectiveEsgFields> & {
  generatedAt: string;
  commonReportingPeriod: string | null;
  hasMixedReportingPeriods: boolean;
  acceptedFindings: EffectiveEsgField[];
  attentionFields: EffectiveEsgField[];
  sections: ReportSection[];
  limitations: readonly string[];
  disclaimer: string;
};

export function projectEsgReport(
  validation: ValidationData,
  reviews: DemoReviewState,
  generatedAt: string
): EsgReportProjection {
  if (!Number.isFinite(Date.parse(generatedAt))) {
    throw new Error("A valid report generation timestamp is required.");
  }

  const effective = projectEffectiveEsgFields(validation, reviews);
  const reportingPeriods = new Set(
    effective.fields.flatMap((field) =>
      field.reportingPeriod ? [field.reportingPeriod] : []
    )
  );
  const categories = Object.keys(REPORT_CATEGORY_LABELS) as EsgCategory[];

  return {
    ...effective,
    generatedAt,
    commonReportingPeriod:
      reportingPeriods.size === 1 ? [...reportingPeriods][0] : null,
    hasMixedReportingPeriods: reportingPeriods.size > 1,
    acceptedFindings: effective.fields.filter(
      (field) => field.disposition === "accepted"
    ),
    attentionFields: effective.fields.filter(
      (field) => field.disposition !== "accepted"
    ),
    sections: categories.map((category) => {
      const fields = effective.fields.filter((field) => field.category === category);
      return {
        category,
        label: REPORT_CATEGORY_LABELS[category],
        fields,
        accepted: fields.filter((field) => field.disposition === "accepted").length,
        unverified: fields.filter((field) => field.disposition === "unverified").length,
        rejected: fields.filter((field) => field.disposition === "rejected").length,
        missing: fields.filter((field) => field.disposition === "missing").length,
      };
    }),
    limitations: REPORT_LIMITATIONS,
    disclaimer: REPORT_DISCLAIMER,
  };
}
