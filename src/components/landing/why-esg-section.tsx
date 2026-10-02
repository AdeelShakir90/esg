import { Clock, PiggyBank, ShieldCheck } from "lucide-react";

import { SectionTitle, Subtitle } from "@/components/primitives/typography";
import { design } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const reasons = [
  {
    title: "Save Time",
    description:
      "Stop rebuilding the same tables every quarter. Reuse uploads and AI drafts to move from zero to first report faster.",
    icon: Clock,
  },
  {
    title: "Reduce Costs",
    description:
      "Avoid oversized consultant retainers for your first disclosure cycle — start lean and scale support when you need it.",
    icon: PiggyBank,
  },
  {
    title: "Stay Compliant",
    description:
      "Structure content around what banks, customers, and frameworks ask for so you are ready when scrutiny increases.",
    icon: ShieldCheck,
  },
];

export function WhyEsgSection() {
  return (
    <section
      id="why"
      className={cn("scroll-mt-20 bg-muted/25", design.section.y)}
    >
      <div className={cn(design.page.marketing, "text-center")}>
        <SectionTitle>Why envario</SectionTitle>
        <Subtitle className="mx-auto mt-4 max-w-2xl">
          Built for operators who need outcomes, not another complex enterprise tool.
        </Subtitle>
        <ul className="mx-auto mt-10 grid max-w-5xl gap-6 text-left sm:mt-14 md:grid-cols-3 md:gap-8">
          {reasons.map((item) => (
            <li key={item.title} className={design.marketing.featureCard}>
              <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                <item.icon className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <h3 className="mt-5 text-base font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
