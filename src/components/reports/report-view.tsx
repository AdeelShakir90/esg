"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSearch,
  FileText,
  Loader2,
  LockKeyhole,
  Quote,
  ShieldAlert,
} from "lucide-react";

import { ContentCard } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { useDemoReview } from "@/components/validation/demo-review-provider";
import {
  loadValidationData,
  type ValidationLoadErrorCode,
} from "@/components/validation/validation-data-action";
import type { EffectiveEsgField } from "@/lib/esg/effective-fields";
import {
  projectEsgReport,
  type EsgReportProjection,
  type ReportSection,
} from "@/lib/esg/report";
import {
  createEsgReportSnapshot,
  formatReportTimestamp,
} from "@/lib/esg/report-export";
import type { ValidationData } from "@/lib/esg/validation";
import { getDemoReviewScope } from "@/lib/esg/validation-review";
import { cn } from "@/lib/utils";

type ReportViewProps = {
  documentId: string | null;
  invalidDocumentId: boolean;
};

type ViewState =
  | { status: "empty" }
  | { status: "loading" }
  | { status: "ready"; validation: ValidationData; generatedAt: string }
  | {
      status: "error";
      code: ValidationLoadErrorCode | "invalid_projection";
    };

const ERROR_CONTENT: Record<
  ValidationLoadErrorCode | "invalid_projection",
  { title: string; message: string }
> = {
  invalid_document_id: {
    title: "Invalid document link",
    message: "Choose a document with completed ESG extraction from Documents.",
  },
  document_not_found: {
    title: "Document not found",
    message: "This document is unavailable or no longer exists.",
  },
  extraction_not_found: {
    title: "No completed ESG extraction",
    message: "Extract ESG data for this document before opening its report preview.",
  },
  stale_extraction: {
    title: "Extraction is out of date",
    message: "Run ESG extraction again so the report matches the current PDF text.",
  },
  incomplete_extraction: {
    title: "Extraction is incomplete",
    message: "The report requires all 12 canonical ESG indicator records.",
  },
  unauthorized: {
    title: "Report access unavailable",
    message: "The controlled MVP data service is not authorized for this request.",
  },
  invalid_response: {
    title: "Unexpected report data",
    message: "The report service returned an unsupported response.",
  },
  data_unavailable: {
    title: "Report data unavailable",
    message: "The ESG data could not be loaded right now. Please try again later.",
  },
  invalid_projection: {
    title: "Report could not be prepared",
    message: "The ESG fields could not be converted into a safe report preview.",
  },
};

const REVIEW_LABELS = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  edited: "Edited",
} as const;

function StatusView({ state }: { state: Exclude<ViewState, { status: "ready" }> }) {
  const loading = state.status === "loading";
  const content =
    state.status === "empty"
      ? {
          title: "Choose a document for this report",
          message:
            "Reports use one document and its latest current completed ESG extraction.",
        }
      : loading
        ? {
            title: "Preparing report preview",
            message: "Loading the latest current ESG extraction and review state.",
          }
        : ERROR_CONTENT[state.code];

  return (
    <div className="mx-auto w-full max-w-3xl py-10">
      <ContentCard elevation="lg" className="p-8 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {loading ? (
            <Loader2 className="size-6 animate-spin" aria-hidden />
          ) : (
            <FileSearch className="size-6" aria-hidden />
          )}
        </span>
        <h1 className="mt-5 font-heading text-2xl font-semibold text-foreground">
          {content.title}
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          {content.message}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {!loading && (
            <Link
              href="/documents"
              className={buttonVariants({ variant: "outline" })}
            >
              Go to Documents
            </Link>
          )}
          <Button variant="outline" disabled>
            <Download className="size-4" aria-hidden />
            Download Draft PDF
          </Button>
        </div>
      </ContentCard>
    </div>
  );
}

function ReviewBadge({ field }: { field: EffectiveEsgField }) {
  return (
    <Badge
      variant={field.reviewStatus === "rejected" ? "destructive" : "outline"}
      className={cn(
        field.reviewStatus === "approved" &&
          "border-primary/20 bg-primary/10 text-primary",
        field.reviewStatus !== "rejected" && "text-muted-foreground"
      )}
    >
      {REVIEW_LABELS[field.reviewStatus]}
      {field.isTemporary && field.reviewStatus !== "pending" ? " (demo)" : ""}
    </Badge>
  );
}

function IndicatorCard({ field }: { field: EffectiveEsgField }) {
  const edited = field.reviewStatus === "edited";
  const rejected = field.disposition === "rejected";
  const pending = field.disposition === "unverified";

  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-sm",
        rejected && "border-destructive/25"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-heading text-base font-semibold text-foreground">
            {field.label}
          </h3>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
            {field.displayValue}
            {field.effectiveValue && field.unit ? (
              <span className="ml-1.5 text-sm font-medium text-muted-foreground">
                {field.unit}
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {rejected
              ? "Source value shown for traceability only"
              : edited
                ? "Temporary reviewed value"
                : "AI-extracted source value"}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Badge
            variant={field.extractionStatus === "found" ? "secondary" : "outline"}
          >
            {field.extractionStatus === "found" ? "Found" : "Not found"}
          </Badge>
          <ReviewBadge field={field} />
        </div>
      </div>

      {edited && (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/[0.04] p-3 text-sm">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Original AI value
          </p>
          <p className="mt-1 font-medium text-foreground">
            {field.sourceDisplayValue}
            {field.sourceValue && field.unit ? ` ${field.unit}` : ""}
          </p>
        </div>
      )}

      {pending && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
          Unverified draft information. Human review is still pending.
        </p>
      )}

      {rejected && (
        <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/[0.05] p-3 text-xs leading-5 text-destructive">
          Rejected for this review session and excluded from accepted findings.
        </p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border/50 pt-4 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Reporting period</dt>
          <dd className="mt-1 font-medium text-foreground">
            {field.reportingPeriod ?? "Not specified"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Confidence</dt>
          <dd className="mt-1 font-medium text-foreground">
            {field.confidence ?? "Not available"}
          </dd>
        </div>
      </dl>

      {field.evidence.quote && (
        <blockquote className="mt-4 rounded-xl border-l-2 border-primary/40 bg-secondary/30 px-4 py-3 text-sm leading-6 text-muted-foreground">
          <Quote className="mb-1 size-4 text-primary" aria-hidden />
          {field.evidence.quote}
        </blockquote>
      )}
    </article>
  );
}

function ReportSectionView({ section }: { section: ReportSection }) {
  return (
    <section aria-labelledby={`${section.category}-report-heading`}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">ESG category</p>
          <h2
            id={`${section.category}-report-heading`}
            className="mt-1 font-heading text-2xl font-semibold text-foreground"
          >
            {section.label}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {section.accepted} accepted · {section.unverified} pending · {section.rejected}{" "}
          rejected · {section.missing} missing
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {section.fields.map((field) => (
          <IndicatorCard key={field.id} field={field} />
        ))}
      </div>
    </section>
  );
}

function AttentionItem({ field }: { field: EffectiveEsgField }) {
  const reason =
    field.disposition === "rejected"
      ? "Rejected and excluded from accepted findings"
      : field.disposition === "missing"
        ? "No supported value was found"
        : "Pending human review";

  return (
    <article className="border-t border-border/50 py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-medium text-foreground">{field.label}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{reason}</p>
        </div>
        <ReviewBadge field={field} />
      </div>
      {field.evidence.quote && (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          <span className="font-medium text-foreground">Source evidence:</span>{" "}
          {field.evidence.quote}
        </p>
      )}
    </article>
  );
}

function SummaryCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: Array<readonly [string, number]>;
}) {
  return (
    <ContentCard className="p-6">
      <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <dl className={cn("mt-5 grid gap-3", items.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}>
        {items.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </ContentCard>
  );
}

function ReadyReport({ report }: { report: EsgReportProjection }) {
  const [downloadState, setDownloadState] = useState<
    "idle" | "generating" | "error"
  >("idle");

  async function handleDownload() {
    if (downloadState === "generating") return;

    setDownloadState("generating");
    const snapshot = createEsgReportSnapshot(report, new Date().toISOString());

    try {
      const { downloadEsgReportPdf } = await import("./report-pdf-download");
      await downloadEsgReportPdf(snapshot);
      setDownloadState("idle");
    } catch {
      setDownloadState("error");
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 sm:space-y-10">
      <header className="flex flex-col gap-6 border-b border-border/60 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl">
          <Badge className="bg-primary/10 text-primary">Controlled MVP · Draft</Badge>
          <h1 className="mt-4 font-heading text-3xl font-semibold text-foreground sm:text-4xl">
            DRAFT ESG DATA REPORT
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Document-scoped preview of extracted ESG indicators and current temporary review decisions.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 lg:items-end">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleDownload}
              disabled={downloadState === "generating"}
            >
              {downloadState === "generating" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Download className="size-4" aria-hidden />
              )}
              {downloadState === "generating"
                ? "Generating PDF..."
                : "Download Draft PDF"}
            </Button>
            <Link
              href={`/validation?documentId=${encodeURIComponent(report.document.id)}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Review ESG data
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href={`/dashboard?documentId=${encodeURIComponent(report.document.id)}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Dashboard
            </Link>
            <Link href="/documents" className={buttonVariants({ variant: "outline" })}>
              Documents
            </Link>
          </div>
          {downloadState === "error" ? (
            <p className="text-sm text-destructive" role="alert">
              PDF generation failed. Please try again.
            </p>
          ) : null}
        </div>
      </header>

      <ContentCard elevation="lg" className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">Source PDF</p>
          <p className="mt-1 break-words font-medium text-foreground">{report.document.fileName}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Generated</p>
          <p className="mt-1 font-medium text-foreground">
            {formatReportTimestamp(report.generatedAt)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Reporting period</p>
          <p className="mt-1 font-medium text-foreground">
            {report.commonReportingPeriod ??
              (report.hasMixedReportingPeriods
                ? "Multiple field-specific periods"
                : "Not specified")}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Schema</p>
          <p className="mt-1 font-medium text-foreground">{report.extraction.schemaVersion}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Extraction completed</p>
          <p className="mt-1 font-medium text-foreground">
            {formatReportTimestamp(report.extraction.completedAt)}
          </p>
        </div>
        <div className="md:col-span-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">Extraction ID</p>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{report.extraction.id}</p>
        </div>
      </ContentCard>

      <div className="flex gap-3 rounded-2xl border border-primary/20 bg-primary/[0.06] px-5 py-4 text-sm leading-6 text-foreground shadow-sm" role="status">
        <LockKeyhole className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <p>
          <span className="font-semibold">Demo mode</span> — temporary review decisions shown in this report are held in memory and are not saved to Supabase. Refreshing or opening another tab clears them.
        </p>
      </div>

      <ContentCard className="p-6">
        <div className="flex gap-3">
          <FileText className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">Scope and methodology</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This preview uses text extracted from one uploaded PDF, AI-assisted mapping to 12 canonical ESG indicators, and the current temporary human review state. It does not combine documents or extraction runs, calculate ESG scores, or assess reporting compliance.
            </p>
          </div>
        </div>
      </ContentCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SummaryCard
          title="Source coverage"
          description="Immutable extraction coverage."
          items={[["Total", report.total], ["Found", report.found], ["Not found", report.notFound]]}
        />
        <SummaryCard
          title="Review and data quality"
          description="Review status is separate from source coverage."
          items={[["Pending", report.pending], ["Approved", report.approved], ["Edited", report.edited], ["Rejected", report.rejected]]}
        />
      </div>

      {report.sections.map((section) => (
        <ReportSectionView key={section.category} section={section} />
      ))}

      <ContentCard className="p-6">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Missing, pending and rejected indicators
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Pending values are unverified draft information. Rejected values are excluded from accepted findings. Missing fields have no supported value.
            </p>
            <div className="mt-5">
              {report.attentionFields.length > 0 ? (
                report.attentionFields.map((field) => (
                  <AttentionItem key={field.id} field={field} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No indicators currently require attention.</p>
              )}
            </div>
          </div>
        </div>
      </ContentCard>

      <ContentCard className="p-6">
        <div className="flex gap-3">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">Limitations</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              {report.limitations.map((limitation) => (
                <li key={limitation}>• {limitation}</li>
              ))}
            </ul>
          </div>
        </div>
      </ContentCard>

      <div className="flex gap-3 rounded-2xl border border-destructive/20 bg-destructive/[0.04] px-5 py-4 text-sm font-medium leading-6 text-foreground">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
        <p>{report.disclaimer}</p>
      </div>
    </div>
  );
}

export function ReportView({ documentId, invalidDocumentId }: ReportViewProps) {
  const { getReviews } = useDemoReview();
  const [state, setState] = useState<ViewState>(() => {
    if (!documentId) {
      return invalidDocumentId
        ? { status: "error", code: "invalid_document_id" }
        : { status: "empty" };
    }
    return { status: "loading" };
  });

  useEffect(() => {
    if (!documentId) return;
    let active = true;

    void loadValidationData(documentId).then((result) => {
      if (!active) return;
      setState(
        result.success
          ? {
              status: "ready",
              validation: result.validation,
              generatedAt: new Date().toISOString(),
            }
          : { status: "error", code: result.code }
      );
    });

    return () => {
      active = false;
    };
  }, [documentId]);

  const report = useMemo(() => {
    if (state.status !== "ready") return null;
    try {
      const scopeKey = getDemoReviewScope(
        state.validation.document.id,
        state.validation.extraction.id
      );
      return projectEsgReport(
        state.validation,
        getReviews(scopeKey),
        state.generatedAt
      );
    } catch {
      return null;
    }
  }, [getReviews, state]);

  if (state.status === "ready") {
    return report ? (
      <ReadyReport report={report} />
    ) : (
      <StatusView state={{ status: "error", code: "invalid_projection" }} />
    );
  }

  return <StatusView state={state} />;
}
