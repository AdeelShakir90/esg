"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  CircleX,
  FileCheck2,
  Loader2,
  LockKeyhole,
  Pencil,
  Quote,
  RotateCcw,
  Save,
} from "lucide-react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ContentCard } from "@/components/primitives/content-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
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
import {
  createDemoReviewSession,
  getDemoReviewScope,
  getDemoReviewSummary,
  getEffectiveDemoReview,
  getScopedDemoReviews,
  parseDemoEditedValue,
  resetDemoReviewDecision,
  setDemoReviewDecision,
  type DemoReviewDecision,
} from "@/lib/esg/validation-review";
import type { EsgFieldValue } from "@/lib/esg/schema";
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
  temporary = false,
}: {
  status: ValidationField["validationStatus"];
  temporary?: boolean;
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
      {temporary && status !== "pending" ? " (demo)" : ""}
    </Badge>
  );
}

function formatReviewValue(value: EsgFieldValue | null, unit: string | null) {
  if (!value) return "Not found";
  const formatted =
    value.type === "boolean"
      ? value.value
        ? "Yes"
        : "No"
      : new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(
          value.value
        );
  return unit && value.type !== "boolean" ? `${formatted} ${unit}` : formatted;
}

function FieldCard({
  field,
  decision,
  onDecision,
  onReset,
}: {
  field: ValidationField;
  decision: DemoReviewDecision | undefined;
  onDecision: (decision: DemoReviewDecision) => void;
  onReset: () => void;
}) {
  const confidence = formatConfidence(field.confidence);
  const reportingPeriod = formatReportingPeriod(field);
  const effectiveReview = getEffectiveDemoReview(field, decision);
  const [editing, setEditing] = useState(false);
  const [draftValue, setDraftValue] = useState<string | boolean | null>("");
  const [editError, setEditError] = useState<string | null>(null);

  function beginEdit() {
    const currentValue = effectiveReview.value;
    setDraftValue(
      currentValue?.type === "boolean"
        ? currentValue.value
        : currentValue?.value.toString() ?? ""
    );
    setEditError(null);
    setEditing(true);
  }

  function finishDecision(nextDecision: DemoReviewDecision) {
    onDecision(nextDecision);
    setEditing(false);
    setEditError(null);
  }

  function saveEdit() {
    if (draftValue === null) {
      setEditError("Choose Yes or No.");
      return;
    }
    const parsed = parseDemoEditedValue(field.key, draftValue);
    if (!parsed.success) {
      setEditError(parsed.message);
      return;
    }
    finishDecision({ status: "edited", editedValue: parsed.value });
  }

  const isBoolean = field.value?.type === "boolean" ||
    field.key === "supplier_code_of_conduct" ||
    field.key === "anti_corruption_policy";

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
              effectiveReview.value ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {formatReviewValue(effectiveReview.value, field.unit)}
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
            <ValidationStatusBadge
              status={effectiveReview.status}
              temporary={effectiveReview.isTemporary}
            />
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

      {decision?.status === "edited" && (
        <div className="mt-4 grid gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Original AI value
            </p>
            <p className="mt-1 font-medium text-foreground">
              {formatExtractedValue(field)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-primary">
              Temporary edited value
            </p>
            <p className="mt-1 font-medium text-foreground">
              {formatReviewValue(decision.editedValue, field.unit)}
            </p>
          </div>
        </div>
      )}

      {field.evidence.quote && (
        <blockquote className="mt-4 rounded-xl border-l-2 border-primary/40 bg-secondary/35 px-4 py-3 text-sm leading-6 text-muted-foreground">
          <Quote className="mb-1 size-4 text-primary" aria-hidden />
          {field.evidence.quote}
        </blockquote>
      )}

      {editing && (
        <div className="mt-4 rounded-xl border border-border/70 bg-muted/25 p-4">
          <p className="text-sm font-medium text-foreground">Temporary value</p>
          {isBoolean ? (
            <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Boolean value">
              {[true, false].map((value) => (
                <Button
                  key={String(value)}
                  type="button"
                  size="sm"
                  variant={draftValue === value ? "secondary" : "outline"}
                  aria-pressed={draftValue === value}
                  onClick={() => {
                    setDraftValue(value);
                    setEditError(null);
                  }}
                >
                  {value ? "Yes" : "No"}
                </Button>
              ))}
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={
                  field.key === "renewable_electricity_share" ||
                  field.key === "recycling_recovery_rate"
                    ? 100
                    : undefined
                }
                step={field.key === "employee_count" ? 1 : "any"}
                inputMode="decimal"
                value={typeof draftValue === "string" ? draftValue : ""}
                aria-invalid={Boolean(editError)}
                aria-describedby={editError ? `${field.id}-edit-error` : undefined}
                onChange={(event) => {
                  setDraftValue(event.target.value);
                  setEditError(null);
                }}
              />
              {field.unit && (
                <span className="shrink-0 text-sm text-muted-foreground">
                  {field.unit}
                </span>
              )}
            </div>
          )}
          {editError && (
            <p id={`${field.id}-edit-error`} className="mt-2 text-xs text-destructive" role="alert">
              {editError}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={saveEdit}>
              <Save className="size-3.5" aria-hidden />
              Use temporary value
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setEditError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border/50 pt-4 sm:flex sm:flex-wrap">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            finishDecision({ status: "approved", editedValue: null })
          }
        >
          <CheckCircle2 className="size-3.5" aria-hidden />
          Approve
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={beginEdit}>
          <Pencil className="size-3.5" aria-hidden />
          Edit
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={() =>
            finishDecision({ status: "rejected", editedValue: null })
          }
        >
          <CircleX className="size-3.5" aria-hidden />
          Reject
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!decision}
          onClick={() => {
            onReset();
            setEditing(false);
            setEditError(null);
          }}
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Reset
        </Button>
      </div>
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

function ReadyValidationView({ validation }: { validation: ValidationData }) {
  const scopeKey = getDemoReviewScope(
    validation.document.id,
    validation.extraction.id
  );
  const [reviewSession, setReviewSession] = useState(() =>
    createDemoReviewSession(scopeKey)
  );
  const reviews = getScopedDemoReviews(reviewSession, scopeKey);
  const summary = getDemoReviewSummary(validation.fields, reviews);
  const groupedFields = useMemo(
    () => ({
      environmental: validation.fields.filter(
        (field) => field.category === "environmental"
      ),
      social: validation.fields.filter((field) => field.category === "social"),
      governance: validation.fields.filter(
        (field) => field.category === "governance"
      ),
    }),
    [validation.fields]
  );

  return (
    <DashboardShell>
      <div className="space-y-8">
        <ContentCard elevation="lg" className="overflow-hidden">
          <div className="border-b border-border/50 bg-secondary/20 p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <Badge className="bg-primary/10 text-primary">Demo validation</Badge>
                <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-foreground">
                  Validate extracted ESG data
                </h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">
                  Review real extracted fields and try validation decisions for this
                  session. Source values and evidence remain unchanged.
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

        <div
          className="flex gap-3 rounded-2xl border border-primary/20 bg-primary/[0.06] px-5 py-4 text-sm text-foreground shadow-sm"
          role="status"
        >
          <LockKeyhole className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <p>
            <span className="font-semibold">Demo mode</span> — review changes are
            temporary and are not saved to Supabase.
          </p>
        </div>

        <ContentCard className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Review summary
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Current status for this temporary browser session.
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(
                [
                  ["Total", summary.total],
                  ["Approved", summary.approved],
                  ["Edited", summary.edited],
                  ["Rejected", summary.rejected],
                  ["Pending", summary.pending],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-24 rounded-xl border border-border/60 bg-muted/25 px-3 py-2 text-center"
                >
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 text-lg font-semibold text-foreground">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </ContentCard>

        {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map(
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
                  <FieldCard
                    key={field.id}
                    field={field}
                    decision={reviews[field.id]}
                    onDecision={(decision) =>
                      setReviewSession((current) =>
                        setDemoReviewDecision(
                          current,
                          scopeKey,
                          field.id,
                          decision
                        )
                      )
                    }
                    onReset={() =>
                      setReviewSession((current) =>
                        resetDemoReviewDecision(current, scopeKey, field.id)
                      )
                    }
                  />
                ))}
              </div>
            </section>
          )
        )}

        <ContentCard className="flex gap-3 p-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LockKeyhole className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-heading font-semibold text-foreground">
              Temporary review session
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Reset restores a field to its backend state. Changing documents,
              changing extraction runs, or refreshing this page discards every demo
              decision.
            </p>
          </div>
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

  return (
    <ReadyValidationView
      key={`${state.validation.document.id}:${state.validation.extraction.id}`}
      validation={state.validation}
    />
  );
}
