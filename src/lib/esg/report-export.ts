import type { EsgReportProjection } from "./report";

export type EsgReportSnapshot = EsgReportProjection;

export function formatReportTimestamp(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("A valid report timestamp is required.");
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Vienna",
  }).format(date);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
  }
  return value;
}

export function createEsgReportSnapshot(
  report: EsgReportProjection,
  generatedAt: string
): EsgReportSnapshot {
  if (!Number.isFinite(Date.parse(generatedAt))) {
    throw new Error("A valid PDF generation timestamp is required.");
  }

  const snapshot = structuredClone({
    ...report,
    generatedAt,
  });

  return deepFreeze(snapshot);
}

function safeSourceStem(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const normalized = withoutExtension
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");

  return normalized || "document";
}

export function createEsgReportFileName(
  sourceFileName: string,
  generatedAt: string
) {
  const date = new Date(generatedAt);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("A valid PDF generation timestamp is required.");
  }

  return `envario_draft_esg_report_${safeSourceStem(sourceFileName)}_${date
    .toISOString()
    .slice(0, 10)}.pdf`;
}
