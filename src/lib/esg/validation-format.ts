import type { ValidationField } from "./validation";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseValidationDocumentId(
  value: string | string[] | undefined
): string | null {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

export function formatExtractedValue(field: ValidationField) {
  if (field.status === "not_found" || field.value === null) {
    return "Not found";
  }

  const value =
    field.value.type === "boolean"
      ? field.value.value
        ? "Yes"
        : "No"
      : new Intl.NumberFormat("en-US", {
          maximumFractionDigits: 3,
        }).format(field.value.value);

  return field.unit ? `${value} ${field.unit}` : value;
}

export function formatReportingPeriod(field: ValidationField) {
  const { label, start, end } = field.reportingPeriod;
  if (label) return label;
  if (start && end) return `${start} to ${end}`;
  return start ?? end ?? null;
}

export function formatConfidence(confidence: number | null) {
  return confidence === null ? null : `${Math.round(confidence * 100)}%`;
}
