"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, Loader2, Lock } from "lucide-react";

import { ContentCard } from "@/components/primitives/content-card";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { design } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const STEPS = [
  "Upload complete",
  "Extracting data",
  "Analyzing ESG",
  "Generating report",
] as const;

const R = 52;
const CIRC = 2 * Math.PI * R;

function stepVisualState(progress: number, index: number) {
  if (index === 0) {
    return { complete: true, active: false };
  }
  if (progress >= 100) {
    return { complete: true, active: false };
  }
  if (index === 1) {
    return { complete: progress >= 28, active: progress < 28 };
  }
  if (index === 2) {
    return {
      complete: progress >= 56,
      active: progress >= 28 && progress < 56,
    };
  }
  return {
    complete: false,
    active: progress >= 56,
  };
}

function CircularProgress({ value }: { value: number }) {
  const pct = Math.min(100, Math.round(value));
  const offset = CIRC - (pct / 100) * CIRC;

  return (
    <div className="relative mx-auto size-[9.5rem] sm:size-[11rem]">
      <div
        className="processing-ambient pointer-events-none absolute -inset-6 rounded-full bg-gradient-to-tr from-primary/25 via-secondary/40 to-primary/10 opacity-70 blur-2xl"
        aria-hidden
      />
      <div
        className="processing-glow-pulse pointer-events-none absolute -inset-2 rounded-full border border-primary/15 bg-primary/[0.06]"
        aria-hidden
      />
      <svg
        className="relative size-full -rotate-90 drop-shadow-sm"
        viewBox="0 0 120 120"
        aria-hidden
      >
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-muted/40"
        />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke="url(#processing-ring)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
        <defs>
          <linearGradient id="processing-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(31 122 99)" stopOpacity="1" />
            <stop offset="100%" stopColor="rgb(74 222 155)" stopOpacity="0.85" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        {pct >= 100 ? (
          <CheckCircle2
            className="size-11 text-primary motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-300"
            strokeWidth={1.5}
            aria-hidden
          />
        ) : (
          <>
            <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
              {pct}
            </span>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              %
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export function ProcessingView() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const progressSteps = [1, 8, 13, 24, 39, 47, 58, 66, 74, 83, 91, 100];
    let currentIndex = 0;

    const id = window.setInterval(() => {
      if (currentIndex >= progressSteps.length) {
        window.clearInterval(id);
        return;
      }

      setProgress(progressSteps[currentIndex]);
      currentIndex += 1;
    }, 250);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (progress < 100) return;
    const t = window.setTimeout(() => router.push("/dashboard"), 500);
    return () => window.clearTimeout(t);
  }, [progress, router]);

  const stepRows = useMemo(
    () =>
      STEPS.map((label, i) => ({
        label,
        ...stepVisualState(progress, i),
      })),
    [progress]
  );

  return (
    <div className={design.page.centeredLg}>
      <ContentCard
        elevation="lg"
        className="w-full overflow-hidden border-border/50 shadow-premium"
      >
        <CardHeader className="space-y-2 border-b border-border/50 bg-gradient-to-b from-secondary/30 to-transparent pb-8 text-center">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Preparing your ESG dashboard
          </h1>
          <CardDescription className="text-base text-muted-foreground">
            Generating reports, KPI categories, and exports...
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-10 pt-10 pb-2">
          <CircularProgress value={progress} />

          <ul
            className="flex w-full flex-col gap-2.5"
            aria-label="Analysis steps"
            aria-live="polite"
          >
            {stepRows.map(({ label, complete, active }, i) => (
              <li
                key={label}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition-all duration-500 ease-out",
                  complete &&
                    "border-primary/25 bg-primary/[0.06] text-foreground shadow-sm",
                  active &&
                    "border-primary/40 bg-gradient-to-r from-secondary/80 to-primary/[0.08] text-foreground shadow-md ring-2 ring-primary/25",
                  !complete &&
                    !active &&
                    "border-border/50 bg-muted/20 text-muted-foreground"
                )}
                style={{
                  transitionDelay: active ? `${i * 40}ms` : "0ms",
                }}
              >
                <span className="flex size-8 shrink-0 items-center justify-center">
                  {complete ? (
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-300">
                      <Check className="size-4" strokeWidth={2.5} aria-hidden />
                    </span>
                  ) : active ? (
                    <Loader2
                      className="size-6 text-primary motion-safe:animate-spin"
                      strokeWidth={2}
                      aria-hidden
                    />
                  ) : (
                    <span className="size-6 rounded-full border-2 border-dashed border-border/80 bg-background/80" />
                  )}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 font-medium leading-snug",
                    !complete && !active && "font-normal"
                  )}
                >
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>

        <CardFooter className="flex flex-col gap-5 border-t border-border/50 bg-muted/15 px-4 py-6 sm:px-6">
          <div className="flex gap-3 rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] to-secondary/50 px-4 py-3.5 text-sm text-foreground/90">
            <Lock
              className="mt-0.5 size-4 shrink-0 text-primary"
              strokeWidth={2}
              aria-hidden
            />
            <p className="leading-relaxed">
              Your data is secure and processed automatically using AI
            </p>
          </div>
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "self-center text-muted-foreground transition-colors hover:text-foreground"
            )}
          >
            Skip to dashboard
          </Link>
        </CardFooter>
      </ContentCard>
    </div>
  );
}
