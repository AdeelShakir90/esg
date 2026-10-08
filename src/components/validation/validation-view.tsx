"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  Loader2,
  LockKeyhole,
  Quote,
} from "lucide-react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ContentCard } from "@/components/primitives/content-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  loadValidationData,
  type ValidationLoadErrorCode,
} from "@/components/validation/validation-data-action";
import type {
  ValidationData,
  ValidationField,
} from "@/lib/esg/validation";
import {
  formatConfidence,
  formatExtractedValue,
  formatReportingPeriod,
} from "@/lib/esg/validation-format";
import { cn } from "@/lib/utils";

type ValidationViewProps = {
  documentId: string | null;
  invalidDocumentId: boolean;
};

type ViewState =
  | { status: "loading" }
  | { status: "ready"; validation: ValidationData }
  | { status: "error"; code: ValidationLoadErrorCode | "missing_document_id" };

const CATEGORY_LABELS = {
  environmental: "Environmental",
  social: "Social",
  governance: "Governance",
} as const;

const ERROR_MESSAGES: Record<
  ValidationLoadErrorCode | "missing_document_id",
  { title: string; message: string }
> = {
  missing_document_id: {
    title: "Choose a document to validate",
    message:
      "Open validation from a document after its ESG extraction has completed.",
  },
  invalid_document_id: {
    title: "Invalid document link",
    message: "The document link is not valid. Return to Documents and try again.",
  },
  document_not_found: {
    title: "Document not found",
    message: "This document is unavailable or no longer exists.",
  },
  extraction_not_found: {
    title: "No completed ESG extraction",
    message: "Extract ESG data for this document before opening validation.",
  },
  stale_extraction: {
    title: "ESG extraction is out of date",
    message:
      "The document text changed after ESG extraction. Run ESG extraction again before reviewing it.",
  },
  incomplete_extraction: {
    title: "ESG extraction is incomplete",
    message:
      "The saved extraction does not contain the complete set of validation fields.",
  },
  data_unavailable: {
    title: "Validation data is temporarily unavailable",
    message: "Please return to Documents and try again shortly.",
  },
  unauthorized: {
    title: "Validation access is unavailable",
    message: "The controlled MVP validation service is not configured for access.",
  },
  invalid_response: {
    title: "Validation data could not be read",
    message: "The service returned an unexpected response. Please try again later.",
  },
};

function ValidationStatusBadge({
  status,
}: {
  status: ValidationField["validationStatus"];
}) {
  const labels = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    edited: "Edited",
  } as const;

  return (
    <Badge
      variant={status === "rejected" ? "destructive" : "outline"}
      className={cn(
        "capitalize",
        status === "approved" && "border-primary/20 bg-primary/10 text-primary"
      )}
    >
      {labels[status]}
    </Badge>
  );
}

function FieldCard({ field }: { field: ValidationField }) {
  const confidence = formatConfidence(field.confidence);
  const reportingPeriod = formatReportingPeriod(field);

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-heading text-base font-semibold text-foreground">
            {field.label}
          </h3>
          <p
            className={cn(
              "mt-2 text-2xl font-semibold tracking-tight",
              field.status === "found" ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {formatExtractedValue(field)}
          </p>
        </div>
        <Badge
          variant={field.status === "found" ? "secondary" : "outline"}
          className={cn(
            field.status === "found" &&
              "border border-primary/15 bg-primary/10 text-primary"
          )}
        >
          {field.status === "found" ? "Found" : "Not found"}
        </Badge>
      </div>

      <dl className="mt-5 grid gap-3 border-t border-border/50 pt-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase text-muted-foreground">
            Validation
          </dt>
          <dd className="mt-1">
            <ValidationStatusBadge status={field.validationStatus} />
          </dd>
        </div>
        {confidence && (
          <div>
            <dt className="text-xs font-medium uppercase text-muted-foreground">
              Confidence
            </dt>
            <dd className="mt-1 font-medium text-foreground">{confidence}</dd>
          </div>
        )}
        {reportingPeriod && (
          <div className="sm:col-span-2">
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
              <CalendarDays className="size-3.5" aria-hidden />
              Reporting period
            </dt>
            <dd className="mt-1 text-foreground">{reportingPeriod}</dd>
          </div>
        )}
      </dl>

      {field.evidence.quote && (
        <blockquote className="mt-4 rounded-xl border-l-2 border-primary/40 bg-secondary/35 px-4 py-3 text-sm leading-6 text-muted-foreground">
          <Quote className="mb-1 size-4 text-primary" aria-hidden />
          {field.evidence.quote}
        </blockquote>
      )}
    </article>
  );
}

function StateMessage({
  title,
  message,
  loading = false,
}: {
  title: string;
  message: string;
  loading?: boolean;
}) {
  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-3xl py-10">
        <ContentCard elevation="lg" className="p-8 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {loading ? (
              <Loader2 className="size-6 animate-spin" aria-hidden />
            ) : (
              <AlertCircle className="size-6" aria-hidden />
            )}
          </span>
          <h1 className="mt-5 font-heading text-2xl font-semibold text-foreground">
            {title}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {message}
          </p>
          {!loading && (
            <Link
              href="/documents"
              className={cn(buttonVariants({ variant: "outline" }), "mt-6")}
            >
              Back to Documents
            </Link>
          )}
        </ContentCard>
      </div>
    </DashboardShell>
  );
}

export function ValidationView({
  documentId,
  invalidDocumentId,
}: ValidationViewProps) {
  const [state, setState] = useState<ViewState>(() => {
    if (!documentId) {
      return {
        status: "error",
        code: invalidDocumentId ? "invalid_document_id" : "missing_document_id",
      };
    }
    return { status: "loading" };
  });

  useEffect(() => {
    if (!documentId) return;
    let cancelled = false;

    void loadValidationData(documentId).then((result) => {
      if (cancelled) return;
      setState(
        result.success
          ? { status: "ready", validation: result.validation }
          : { status: "error", code: result.code }
      );
    });

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const groupedFields = useMemo(() => {
    if (state.status !== "ready") return null;
    return {
      environmental: state.validation.fields.filter(
        (field) => field.category === "environmental"
      ),
      social: state.validation.fields.filter((field) => field.category === "social"),
      governance: state.validation.fields.filter(
        (field) => field.category === "governance"
      ),
    };
  }, [state]);

  if (state.status === "loading") {
    return (
      <StateMessage
        loading
        title="Loading validation data"
        message="Retrieving the latest completed ESG extraction for this document."
      />
    );
  }

  if (state.status === "error") {
    const error = ERROR_MESSAGES[state.code];
    return <StateMessage title={error.title} message={error.message} />;
  }

  const { validation } = state;

  return (
    <DashboardShell>
      <div className="space-y-8">
        <ContentCard elevation="lg" className="overflow-hidden">
          <div className="border-b border-border/50 bg-secondary/20 p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <Badge className="bg-primary/10 text-primary">Read-only validation</Badge>
                <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-foreground">
                  Validate extracted ESG data
                </h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">
                  Review the latest completed extraction. Editing and approval will be
                  added in the next validation milestone.
                </p>
              </div>
              <Link
                href="/documents"
                className={buttonVariants({ variant: "outline" })}
              >
                Back to Documents
              </Link>
            </div>
          </div>

          <div className="grid gap-5 p-6 md:grid-cols-2 md:p-8 xl:grid-cols-4">
            <div className="md:col-span-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Document
              </p>
              <p className="mt-1 break-words font-medium text-foreground">
                {validation.document.fileName}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Schema
              </p>
              <p className="mt-1 font-medium text-foreground">
                {validation.extraction.schemaVersion}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Completed
              </p>
              <p className="mt-1 font-medium text-foreground">
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(validation.extraction.completedAt))}
              </p>
            </div>
            <div className="md:col-span-2 xl:col-span-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Extraction ID
              </p>
              <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                {validation.extraction.id}
              </p>
            </div>
          </div>
        </ContentCard>

        {groupedFields &&
          (Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map(
            (category) => (
              <section key={category} aria-labelledby={`${category}-heading`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2
                      id={`${category}-heading`}
                      className="font-heading text-xl font-semibold text-foreground"
                    >
                      {CATEGORY_LABELS[category]}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {groupedFields[category].length} extracted fields
                    </p>
                  </div>
                  <FileCheck2 className="size-5 text-primary" aria-hidden />
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {groupedFields[category].map((field) => (
                    <FieldCard key={field.id} field={field} />
                  ))}
                </div>
              </section>
            )
          )}

        <ContentCard className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <LockKeyhole className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-heading font-semibold text-foreground">
                Review controls are read-only
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                No approval, rejection, or edits will be saved in this milestone.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled>
              Edit values unavailable
            </Button>
            <Button type="button" disabled>
              <CheckCircle2 className="size-4" aria-hidden />
              Approve fields unavailable
            </Button>
          </div>
        </ContentCard>
      </div>
    </DashboardShell>
  );
}
