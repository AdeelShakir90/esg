"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  FileCheck2,
  FileText,
  Leaf,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Users,
} from "lucide-react";

import { ContentCard } from "@/components/primitives/content-card";
import { PageTitle, Subtitle } from "@/components/primitives/typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  loadValidationData,
  type ValidationLoadErrorCode,
} from "@/components/validation/validation-data-action";
import { useDemoReview } from "@/components/validation/demo-review-provider";
import { design } from "@/lib/design-tokens";
import {
  projectDashboardData,
  type DashboardCategoryProjection,
  type DashboardIndicator,
  type DashboardProjection,
} from "@/lib/esg/dashboard";
import type { EsgCategory } from "@/lib/esg/definitions";
import type { ValidationData } from "@/lib/esg/validation";
import { getDemoReviewScope } from "@/lib/esg/validation-review";
import { cn } from "@/lib/utils";

type DashboardOverviewProps = {
  documentId: string | null;
  invalidDocumentId: boolean;
};

type ViewState =
  | { status: "empty" }
  | { status: "loading" }
  | { status: "ready"; validation: ValidationData }
  | { status: "error"; code: ValidationLoadErrorCode | "invalid_projection" };

const CATEGORY_DETAILS: Record<
  EsgCategory,
  { title: string; description: string; icon: typeof Leaf }
> = {
  environmental: {
    title: "Environmental",
    description: "Resource use, emissions, water, and waste indicators.",
    icon: Leaf,
  },
  social: {
    title: "Social",
    description: "Workforce size and employee training indicators.",
    icon: Users,
  },
  governance: {
    title: "Governance",
    description: "Policy indicators detected in the source document.",
    icon: ShieldCheck,
  },
};

const VALIDATION_LABELS = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  edited: "Edited",
} as const;

const ERROR_MESSAGES: Record<
  ValidationLoadErrorCode | "invalid_projection",
  { title: string; message: string }
> = {
  invalid_document_id: {
    title: "Invalid document link",
    message: "Choose a document from the Documents page to open its dashboard.",
  },
  document_not_found: {
    title: "Document not found",
    message: "This document is unavailable or no longer exists.",
  },
  extraction_not_found: {
    title: "ESG extraction not available",
    message: "Complete ESG extraction for this document before opening its dashboard.",
  },
  stale_extraction: {
    title: "Extraction needs to be refreshed",
    message: "The stored ESG result no longer matches the document's current PDF text.",
  },
  incomplete_extraction: {
    title: "Extraction is incomplete",
    message: "The latest ESG extraction does not contain all 12 supported indicators.",
  },
  unauthorized: {
    title: "Dashboard access unavailable",
    message: "The controlled MVP data service is not configured for this environment.",
  },
  invalid_response: {
    title: "Unexpected dashboard response",
    message: "The ESG data service returned an unexpected response.",
  },
  data_unavailable: {
    title: "Dashboard temporarily unavailable",
    message: "The stored ESG extraction could not be loaded. Please try again later.",
  },
  invalid_projection: {
    title: "Dashboard data is incomplete",
    message: "The stored extraction cannot be displayed as a complete ESG snapshot.",
  },
};

function StatusView({ state }: { state: Exclude<ViewState, { status: "ready" }> }) {
  if (state.status === "loading") {
    return (
      <ContentCard className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
        <h1 className="mt-5 font-heading text-2xl font-semibold text-foreground">
          Loading ESG dashboard
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Retrieving the latest completed extraction for this document.
        </p>
      </ContentCard>
    );
  }

  const content =
    state.status === "empty"
      ? {
          title: "Choose a document",
          message:
            "Open a document with completed ESG extraction to view its real dashboard snapshot.",
        }
      : ERROR_MESSAGES[state.code];

  return (
    <ContentCard className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {state.status === "empty" ? (
          <FileText className="size-6" aria-hidden />
        ) : (
          <AlertTriangle className="size-6" aria-hidden />
        )}
      </span>
      <h1 className="mt-5 font-heading text-2xl font-semibold text-foreground">
        {content.title}
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        {content.message}
      </p>
      <Link href="/documents" className={cn(buttonVariants(), "mt-6")}>
        Go to Documents
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </ContentCard>
  );
}

function IndicatorCard({ indicator }: { indicator: DashboardIndicator }) {
  const found = indicator.extractionStatus === "found";
  const temporarilyEdited =
    indicator.isTemporary && indicator.reviewStatus === "edited";
  const temporarilyRejected =
    indicator.isTemporary && indicator.reviewStatus === "rejected";

  return (
    <ContentCard
      className={cn(
        "h-full overflow-hidden",
        temporarilyRejected && "border-destructive/25"
      )}
    >
      <CardHeader className="gap-3 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Badge
            variant="secondary"
            className={cn(
              "border font-medium",
              found
                ? "border-primary/15 bg-primary/10 text-primary"
                : "border-border bg-muted text-muted-foreground"
            )}
          >
            {found ? "Found" : "Not found"}
          </Badge>
          <Badge
            variant={indicator.reviewStatus === "rejected" ? "destructive" : "outline"}
            className={cn(
              "font-normal",
              indicator.reviewStatus === "approved" &&
                "border-primary/20 bg-primary/10 text-primary",
              indicator.reviewStatus !== "rejected" && "text-muted-foreground"
            )}
          >
            {VALIDATION_LABELS[indicator.reviewStatus]}
            {indicator.isTemporary && indicator.reviewStatus !== "pending"
              ? " (demo)"
              : ""}
          </Badge>
        </div>
        <CardTitle className="text-base leading-6">{indicator.label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {indicator.displayValue}
            {found && indicator.unit ? (
              <span className="ml-1.5 text-sm font-medium text-muted-foreground">
                {indicator.unit}
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {temporarilyEdited
              ? "Temporary demo edit"
              : temporarilyRejected
                ? "Original AI-extracted value, retained for traceability"
                : "AI-extracted source value"}
          </p>
        </div>

        {temporarilyEdited ? (
          <div className="rounded-lg border border-border/60 bg-muted/25 p-3">
            <p className="text-xs text-muted-foreground">
              Original AI-extracted value
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {indicator.sourceDisplayValue}
              {indicator.sourceValue && indicator.unit ? ` ${indicator.unit}` : ""}
            </p>
          </div>
        ) : null}

        {temporarilyRejected ? (
          <p className="rounded-lg border border-destructive/20 bg-destructive/[0.05] p-3 text-xs leading-5 text-destructive">
            Rejected for this demo session. It remains part of source coverage but is
            not treated as accepted review data.
          </p>
        ) : null}

        <dl className="grid grid-cols-2 gap-3 border-t border-border/50 pt-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Reporting period</dt>
            <dd className="mt-1 font-medium text-foreground">
              {indicator.reportingPeriod ?? "Not specified"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Confidence</dt>
            <dd className="mt-1 font-medium text-foreground">
              {indicator.confidence ?? "Not available"}
            </dd>
          </div>
        </dl>

        {indicator.evidence.quote ? (
          <blockquote className="rounded-lg border border-border/60 bg-muted/25 p-3 text-xs leading-5 text-muted-foreground">
            <span className="font-medium text-foreground">Source evidence: </span>
            {indicator.evidence.quote}
          </blockquote>
        ) : (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <CircleHelp className="size-3.5" aria-hidden />
            No supporting evidence was returned.
          </p>
        )}
      </CardContent>
    </ContentCard>
  );
}

function CategorySection({ category }: { category: DashboardCategoryProjection }) {
  const details = CATEGORY_DETAILS[category.category];
  const Icon = details.icon;

  return (
    <section aria-labelledby={`${category.category}-dashboard-heading`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" aria-hidden />
          </span>
          <div>
            <h2
              id={`${category.category}-dashboard-heading`}
              className="font-heading text-xl font-semibold text-foreground"
            >
              {details.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {details.description}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="w-fit">
          {category.found} of {category.total} found
        </Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {category.indicators.map((indicator) => (
          <IndicatorCard key={indicator.id} indicator={indicator} />
        ))}
      </div>
    </section>
  );
}

function ReadyDashboard({
  projection,
  onClearDemoChanges,
}: {
  projection: DashboardProjection;
  onClearDemoChanges: () => void;
}) {
  const completedAt = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(projection.extraction.completedAt));

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge className="bg-primary/10 text-primary">
            {projection.temporaryDecisionCount > 0
              ? "Temporary demo review applied"
              : "Stored extraction snapshot"}
          </Badge>
          <PageTitle className="mt-3">ESG Dashboard</PageTitle>
          <Subtitle className="mt-1 max-w-3xl">
            Real indicators extracted from {projection.document.fileName}. Values are
            AI-extracted and retain their current review status.
          </Subtitle>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/documents"
            className={buttonVariants({ variant: "outline" })}
          >
            Choose document
          </Link>
          <Link
            href={`/validation?documentId=${encodeURIComponent(projection.document.id)}`}
            className={buttonVariants()}
          >
            Review ESG data
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href={`/reports?documentId=${encodeURIComponent(projection.document.id)}`}
            className={buttonVariants({ variant: "outline" })}
          >
            View report
            <FileText className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      <ContentCard elevation="lg" className="overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-secondary/20">
          <CardTitle className={design.type.cardTitle}>Extraction details</CardTitle>
          <CardDescription>
            One document and one latest completed extraction are shown together.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 p-6 sm:grid-cols-2 xl:grid-cols-4">
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">Document</p>
            <p className="mt-1 break-words font-medium text-foreground">
              {projection.document.fileName}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Schema</p>
            <p className="mt-1 font-medium text-foreground">
              {projection.extraction.schemaVersion}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Completed</p>
            <p className="mt-1 font-medium text-foreground">{completedAt}</p>
          </div>
          <div className="sm:col-span-2 xl:col-span-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Extraction ID
            </p>
            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
              {projection.extraction.id}
            </p>
          </div>
        </CardContent>
      </ContentCard>

      {projection.temporaryDecisionCount > 0 ? (
        <div
          className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/[0.06] px-5 py-4 text-sm leading-6 text-foreground shadow-sm sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <div className="flex gap-3">
            <FileCheck2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <p>
              <span className="font-semibold">Demo mode</span> — reviewed values and
              statuses are temporary and not saved to Supabase.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 bg-background/80"
            onClick={onClearDemoChanges}
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Clear demo changes
          </Button>
        </div>
      ) : (
        <div
          className="flex gap-3 rounded-2xl border border-primary/20 bg-primary/[0.06] px-5 py-4 text-sm leading-6 text-foreground shadow-sm"
          role="status"
        >
          <FileCheck2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <p>
            This dashboard shows the stored extraction snapshot. No temporary demo
            review decisions are active for this document and extraction.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ContentCard>
          <CardHeader>
            <CardTitle className={design.type.cardTitle}>Source coverage</CardTitle>
            <CardDescription>
              Found and not-found states from the immutable extraction source.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-3 gap-3">
              {[
                ["Total fields", projection.total],
                ["Found", projection.found],
                ["Not found", projection.notFound],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3"
                >
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </ContentCard>

        <ContentCard>
          <CardHeader>
            <CardTitle className={design.type.cardTitle}>Demo review status</CardTitle>
            <CardDescription>
              Review decisions are counted separately from source coverage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Pending", projection.pending],
                ["Approved", projection.approved],
                ["Edited", projection.edited],
                ["Rejected", projection.rejected],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3"
                >
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </ContentCard>
      </div>

      {projection.categories.map((category) => (
        <CategorySection key={category.category} category={category} />
      ))}

      <ContentCard className="flex gap-3 p-5 sm:p-6">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <p className="text-sm leading-6 text-muted-foreground">
          This controlled MVP dashboard is read-only. It does not calculate ESG scores,
          trends, benchmarks, historical comparisons, or reporting readiness.
        </p>
      </ContentCard>
    </div>
  );
}

export function DashboardOverview({
  documentId,
  invalidDocumentId,
}: DashboardOverviewProps) {
  const { clearDecisions, getReviews } = useDemoReview();
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
          ? { status: "ready", validation: result.validation }
          : { status: "error", code: result.code }
      );
    });

    return () => {
      active = false;
    };
  }, [documentId]);

  const projection = useMemo(() => {
    if (state.status !== "ready") return null;
    try {
      const scopeKey = getDemoReviewScope(
        state.validation.document.id,
        state.validation.extraction.id
      );
      return projectDashboardData(state.validation, getReviews(scopeKey));
    } catch {
      return null;
    }
  }, [getReviews, state]);

  if (state.status === "ready") {
    return projection ? (
      <ReadyDashboard
        projection={projection}
        onClearDemoChanges={() =>
          clearDecisions(
            getDemoReviewScope(
              projection.document.id,
              projection.extraction.id
            )
          )
        }
      />
    ) : (
      <StatusView state={{ status: "error", code: "invalid_projection" }} />
    );
  }

  return <StatusView state={state} />;
}
