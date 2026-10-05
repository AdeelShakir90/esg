"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Download,
  Leaf,
  MessageCircle,
  Send,
  Shield,
  Upload,
  Users,
  X,
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
import { Input } from "@/components/ui/input";
import {
  mockCarbonEmissions,
  mockComplianceStatus,
  mockDashboardKeyMetrics,
  mockEnergyConsumption,
  mockEsgScores,
  mockRecentActivity,
  type ActivityItem,
} from "@/lib/mock-data";
import { design } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const R = 54;
const CIRC = 2 * Math.PI * R;

type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function EsgScoreRing({ value }: { value: number }) {
  const offset = CIRC - (value / 100) * CIRC;
  return (
    <div className="relative mx-auto size-44 sm:size-48">
      <svg
        className="size-full -rotate-90"
        viewBox="0 0 120 120"
        aria-hidden
      >
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/35"
        />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke="url(#dash-esg-ring)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
        <defs>
          <linearGradient id="dash-esg-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(31 122 99)" />
            <stop offset="100%" stopColor="rgb(74 222 155)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-4xl font-semibold tabular-nums tracking-tight text-foreground sm:text-5xl">
          {value}
        </span>
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          ESG Score
        </span>
      </div>
    </div>
  );
}

function PillarScoreCard({
  title,
  value,
  icon: Icon,
  hint,
}: {
  title: string;
  value: number;
  icon: LucideIcon;
  hint: string;
}) {
  return (
    <ContentCard
      className="transition-[border-color,box-shadow,transform] duration-300 ease-out motion-safe:hover:-translate-y-1 hover:border-primary/18 hover:shadow-soft-lg motion-reduce:transform-none"
    >
      <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" strokeWidth={1.75} aria-hidden />
          </span>
        </div>
        <p className="text-3xl font-semibold tabular-nums text-foreground sm:text-4xl">
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </ContentCard>
  );
}

const vsmeKpiGroups = [
  {
    title: "Environmental",
    icon: Leaf,
    items: [
      "Energy consumption",
      "CO₂ emissions",
      "Waste & recycling",
      "Renewable energy share",
    ],
  },
  {
    title: "Social",
    icon: Users,
    items: [
      "Employee policies",
      "Health & safety",
      "Training records",
      "Diversity indicators",
    ],
  },
  {
    title: "Governance",
    icon: Shield,
    items: [
      "Supplier code of conduct",
      "Anti-corruption policy",
      "Compliance process",
      "ESG responsibility",
    ],
  },
] satisfies { title: string; icon: LucideIcon; items: string[] }[];

const assistantQuickQuestions = [
  "What were my total CO₂ emissions in 2024?",
  "Which ESG data is still missing?",
  "Are we ready for VSME reporting?",
  "What documents should I upload next?",
  "Show my main environmental risks",
  "Which governance policies were detected?",
] as const;

const assistantDemoAnswers = {
  "What were my total CO₂ emissions in 2024?":
    "Based on the uploaded demo data, total estimated CO₂ emissions for 2024 are 60.7 tCO₂e, mainly from energy consumption and Scope 1/2 emissions. In a real version, this would be calculated from validated energy and emissions files.",
  "Which ESG data is still missing?":
    "The current demo data still has gaps in Scope 3 emissions, supplier risk details, water usage, and some social indicators. These fields would be highlighted for user follow-up before final reporting.",
  "Are we ready for VSME reporting?":
    "You are partially ready. Environmental, Social, and Governance KPI categories are detected, but some VSME fields still need validation or additional documents before the report can be considered complete.",
  "What documents should I upload next?":
    "Recommended next uploads are supplier lists, energy invoices, HR policies, waste reports, water usage data, and any existing sustainability or compliance documents.",
  "Show my main environmental risks":
    "The main detected environmental risks are incomplete Scope 3 emissions, limited renewable energy evidence, missing water usage details, and the need to validate waste and recycling data.",
  "Which governance policies were detected?":
    "The prototype detected supplier code of conduct, anti-corruption policy, compliance process information, and ESG responsibility indicators from the uploaded demo documents.",
} satisfies Record<(typeof assistantQuickQuestions)[number], string>;

const assistantFallbackAnswer =
  "This demo assistant currently uses predefined ESG responses. In the real product, it would connect to an AI model that reads validated company documents and answers questions based on the user’s own ESG data.";

function MockBarChart({
  title,
  description,
  data,
  valueSuffix,
  barClass,
}: {
  title: string;
  description: string;
  data: { label: string; value: number }[];
  valueSuffix: string;
  barClass: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ContentCard className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className={cn(design.type.cardTitle)}>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex h-52 items-end justify-between gap-1.5 sm:gap-2 sm:px-1">
          {data.map((d) => {
            const h = Math.max(8, (d.value / max) * 100);
            return (
              <div
                key={d.label}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <div className="flex h-44 w-full flex-col justify-end">
                  <div
                    className={cn(
                      "w-full min-h-[6px] rounded-t-md transition-[height] duration-700 ease-out motion-reduce:transition-none",
                      barClass
                    )}
                    style={{ height: `${h}%` }}
                    title={`${d.value}${valueSuffix}`}
                  />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground sm:text-xs">
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Mock data · MWh or tCO₂e equivalent for demo
        </p>
      </CardContent>
    </ContentCard>
  );
}

function activityIcon(kind: ActivityItem["kind"]) {
  switch (kind) {
    case "pdf":
      return "PDF";
    case "xlsx":
      return "XLSX";
    case "csv":
      return "CSV";
    default:
      return "FILE";
  }
}

export function DashboardOverview() {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      id: "sample-user",
      role: "user",
      content: "Are we ready for VSME reporting?",
    },
    {
      id: "sample-assistant",
      role: "assistant",
      content:
        "You are partially ready. Environmental, Social, and Governance KPI categories are detected, but some VSME fields still need validation or additional documents before the report can be considered complete.",
    },
  ]);

  function addAssistantExchange(question: string, answer: string) {
    setAssistantMessages((messages) => [
      ...messages,
      {
        id: `${messages.length}-user-${question}`,
        role: "user",
        content: question,
      },
      {
        id: `${messages.length}-assistant-${question}`,
        role: "assistant",
        content: answer,
      },
    ]);
  }

  function handleQuickQuestion(question: (typeof assistantQuickQuestions)[number]) {
    addAssistantExchange(question, assistantDemoAnswers[question]);
  }

  function handleAssistantSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const question = assistantInput.trim();
    if (!question) {
      return;
    }

    addAssistantExchange(question, assistantFallbackAnswer);
    setAssistantInput("");
  }

  return (
    <div className={cn(design.page.marketingWide, "space-y-8 sm:space-y-10")}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div>
          <PageTitle>Dashboard</PageTitle>
          <Subtitle className="mt-1">
            ESG performance overview — sample data for demonstration.
          </Subtitle>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href="/upload"
            className={cn(
              buttonVariants(),
              "shadow-premium motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-premium-hover"
            )}
          >
            <Upload className="mr-2 size-4" aria-hidden />
            Upload Documents
          </Link>
          <Button
            type="button"
            variant="outline"
            className="border-border/80"
          >
            <Download className="mr-2 size-4" aria-hidden />
            Download Report
          </Button>
        </div>
      </div>

           <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
        <ContentCard
          elevation="lg"
          className="border-primary/10 bg-gradient-to-b from-card via-card to-secondary/20 shadow-premium lg:col-span-8"
        >
          <CardHeader className="pb-2">
            <CardTitle className={design.type.cardTitle}>Validated ESG insights</CardTitle>
            <CardDescription>
              Instead of a simplified score, the dashboard highlights extracted and validated ESG information.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-sm font-semibold text-foreground">Environmental data</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Energy consumption and emissions data were identified from uploaded files.
              </p>
            </div>
      
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-sm font-semibold text-foreground">Social policies</p>
              <p className="mt-1 text-sm text-muted-foreground">
                HR and employee-related policies were detected for review.
              </p>
            </div>
      
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-sm font-semibold text-foreground">Governance documents</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Supplier and compliance documents are available for report preparation.
              </p>
            </div>
      
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-sm font-semibold text-foreground">User validation</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Extracted data is reviewed by the user before AI analysis continues.
              </p>
            </div>
          </CardContent>
        </ContentCard>
      
        <ContentCard
          elevation="lg"
          className="border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card to-secondary/30 lg:col-span-4"
        >
          <CardHeader className="pb-2">
            <CardTitle className={design.type.cardTitle}>Data readiness</CardTitle>
            <CardDescription>
              The focus is on transparent, validated inputs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
              Documents uploaded
            </div>
            <div className="rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
              ESG fields extracted
            </div>
            <div className="rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
              Data validated by user
            </div>
            <div className="rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
              Ready for report preparation
            </div>
          </CardContent>
        </ContentCard>
      </div>

      <ContentCard
        elevation="lg"
        className="border-primary/10 bg-gradient-to-br from-card via-card to-primary/[0.04]"
      >
        <CardHeader className="pb-3">
          <CardTitle className={design.type.cardTitle}>VSME KPI Categories</CardTitle>
          <CardDescription>
            Main ESG categories currently identified from uploaded company documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {vsmeKpiGroups.map((group) => {
            const Icon = group.icon;

            return (
              <div
                key={group.title}
                className="rounded-2xl border border-border/60 bg-background/75 p-4 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-primary/20 hover:shadow-soft"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" strokeWidth={1.75} aria-hidden />
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
                </div>
                <ul className="space-y-2.5">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm text-muted-foreground"
                    >
                      <CheckCircle2
                        className="mt-0.5 size-4 shrink-0 text-primary"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </CardContent>
      </ContentCard>

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
        <div className="flex flex-col gap-4 lg:col-span-8">
          <MockBarChart
            title="Energy Consumption"
            description="Monthly electricity & thermal (mock MWh)"
            data={mockEnergyConsumption}
            valueSuffix=" MWh"
            barClass="bg-gradient-to-t from-primary/80 to-primary/40"
          />
          <MockBarChart
            title="Carbon Emissions"
            description="Scope 1 & 2 estimated (mock tCO₂e)"
            data={mockCarbonEmissions}
            valueSuffix=" t"
            barClass="bg-gradient-to-t from-emerald-700/90 to-emerald-500/50"
          />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-4">
          <ContentCard>
            <CardHeader className="pb-3">
              <CardTitle className={design.type.cardTitle}>Key Metrics</CardTitle>
              <CardDescription>Snapshot from your last upload cycle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockDashboardKeyMetrics.map((m) => (
                <div
                  key={m.label}
                  className="flex items-start justify-between gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.hint}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-primary">
                    {m.value}
                  </span>
                </div>
              ))}
            </CardContent>
          </ContentCard>
          <ContentCard
            elevation="lg"
            className="border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card to-secondary/30"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className={design.type.cardTitle}>Compliance status</CardTitle>
                <Badge className="border-0 bg-primary/15 font-semibold text-primary hover:bg-primary/20">
                  {mockComplianceStatus.label}
                </Badge>
              </div>
              <CardDescription>Disclosure readiness (demo)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 rounded-xl border border-primary/15 bg-background/60 p-3">
                <CheckCircle2
                  className="mt-0.5 size-5 shrink-0 text-primary"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {mockComplianceStatus.summary}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Next review</span>
                <span className="font-medium tabular-nums text-foreground">
                  {mockComplianceStatus.nextReview}
                </span>
              </div>
            </CardContent>
          </ContentCard>
        </div>
      </div>

      <ContentCard>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className={design.type.cardTitle}>Recent Activity</CardTitle>
            <CardDescription>Latest files in your workspace (mock)</CardDescription>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            4 items · mock timeline
          </span>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <ul className="divide-y divide-border/50">
            {mockRecentActivity.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-4 px-4 py-3.5 transition-[background-color] duration-200 ease-out hover:bg-muted/30 sm:px-6"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-[10px] font-bold text-muted-foreground">
                  {activityIcon(item.kind)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {item.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.action} · {item.time}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </ContentCard>

      {isAssistantOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-4 py-6 backdrop-blur-sm">
          <ContentCard
            elevation="lg"
            className="max-h-[calc(100vh-2rem)] w-full max-w-4xl rounded-3xl border-primary/15 bg-background/95 shadow-premium backdrop-blur"
          >
            <CardHeader className="border-b border-border/60 bg-gradient-to-br from-primary/[0.08] via-background to-background pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <MessageCircle className="size-5" strokeWidth={1.75} aria-hidden />
                  </div>
                  <CardTitle className="text-xl font-semibold text-foreground sm:text-2xl">
                    envario Assistant
                  </CardTitle>
                  <CardDescription className="mt-1 max-w-2xl">
                    Ask questions about your ESG data, VSME KPIs, uploads, validation, and reports.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close ESG Assistant"
                  onClick={() => setIsAssistantOpen(false)}
                  className="shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="grid min-h-0 gap-5 p-4 sm:p-6 lg:grid-cols-[1fr_18rem]">
              <div className="flex min-h-0 flex-col gap-4">
                <div className="min-h-72 flex-1 space-y-3 overflow-y-auto rounded-3xl border border-border/60 bg-muted/25 p-4 sm:max-h-[22rem]">
                  {assistantMessages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                        message.role === "user"
                          ? "ml-auto bg-primary text-primary-foreground shadow-sm"
                          : "bg-background text-muted-foreground shadow-sm ring-1 ring-border/40"
                      )}
                    >
                      {message.content}
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={handleAssistantSubmit}
                  className="flex gap-2 rounded-2xl border border-border/70 bg-background p-2 shadow-sm"
                >
                  <Input
                    value={assistantInput}
                    onChange={(event) => setAssistantInput(event.target.value)}
                    placeholder="Ask about your ESG data..."
                    aria-label="Ask the envario Assistant"
                    className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                  />
                  <Button type="submit" size="icon" aria-label="Send message">
                    <Send className="size-4" aria-hidden />
                  </Button>
                </form>
              </div>

              <div className="rounded-3xl border border-primary/10 bg-primary/[0.04] p-4">
                <p className="text-sm font-semibold text-foreground">Try asking</p>
                <div className="mt-3 grid gap-2">
                  {assistantQuickQuestions.map((question) => (
                    <Button
                      key={question}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickQuestion(question)}
                      className="h-auto justify-start whitespace-normal rounded-xl bg-background/80 px-3 py-2.5 text-left text-xs leading-snug hover:border-primary/25 hover:bg-background"
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </ContentCard>
        </div>
      ) : null}

      <div className="fixed bottom-4 right-4 z-[60] sm:bottom-6 sm:right-6">
        <Button
          type="button"
          size="lg"
          onClick={() => setIsAssistantOpen((open) => !open)}
          aria-expanded={isAssistantOpen}
          className="shadow-premium"
        >
          <MessageCircle className="size-4" aria-hidden />
          ESG Assistant
        </Button>
      </div>
    </div>
  );
}
