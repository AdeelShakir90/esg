import { BarChart3, FileText, Leaf, TrendingUp } from "lucide-react";

/**
 * Decorative placeholder standing in for a product screenshot.
 * Replace with <Image src="..." /> when assets are ready.
 */
export function DashboardMockupPlaceholder() {
  return (
    <div
      className="relative mx-auto w-full max-w-[min(100%,520px)]"
      role="img"
      aria-label="Dashboard preview placeholder"
    >
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-premium ring-1 ring-black/[0.04] transition-shadow duration-500 hover:shadow-premium-hover dark:ring-white/[0.06]">
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-3">
          <span className="size-2.5 rounded-full bg-red-400/80" />
          <span className="size-2.5 rounded-full bg-amber-400/80" />
          <span className="size-2.5 rounded-full bg-primary/50" />
          <span className="ml-3 flex-1 truncate text-center text-[11px] font-medium text-muted-foreground">
            envario · Dashboard
          </span>
        </div>
        <div className="space-y-4 bg-gradient-to-b from-secondary/20 to-background p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                ESG overview
              </p>
              <p className="text-sm font-semibold text-foreground">
                FY 2025 · Demo workspace
              </p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Leaf className="size-4" strokeWidth={1.75} aria-hidden />
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: "Scope 1&2", value: "124t", tone: "text-primary" },
              { label: "Topics", value: "12", tone: "text-foreground" },
              { label: "Reports", value: "3", tone: "text-foreground" },
            ].map((k) => (
              <div
                key={k.label}
                className="rounded-lg border border-border/50 bg-card/90 px-2 py-3 text-center shadow-sm sm:px-3"
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                  {k.label}
                </p>
                <p
                  className={`mt-1 text-base font-semibold tabular-nums sm:text-lg ${k.tone}`}
                >
                  {k.value}
                </p>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border/50 bg-card p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <BarChart3 className="size-3.5" aria-hidden />
                Emissions trend (mock)
              </span>
              <TrendingUp className="size-3.5 text-primary" aria-hidden />
            </div>
            <div className="flex h-24 items-end justify-between gap-1.5 sm:h-28 sm:gap-2">
              {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-md bg-primary/20 transition-colors duration-200 hover:bg-primary/35"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-primary/25 bg-primary/[0.04] px-3 py-3 sm:px-4">
            <FileText className="size-8 shrink-0 text-primary/70" strokeWidth={1.5} />
            <div className="min-w-0 text-left">
              <p className="text-xs font-medium text-foreground">
                Report draft · Q2 summary
              </p>
              <p className="text-[11px] text-muted-foreground">
                Placeholder preview — add your screenshot here
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
