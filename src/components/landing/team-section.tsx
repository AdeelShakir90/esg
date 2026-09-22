import Image from "next/image";

import { SectionTitle, Subtitle } from "@/components/primitives/typography";
import { design } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

type Founder = {
  name: string;
  role: string;
  expertise?: string;
  imageSrc: string;
  imagePosition?: string;
};

const founders: Founder[] = [
  {
    name: "Alex",
    role: "Co-Founder & CEO",
    imageSrc: "/team/alex.jpg",
  },
  {
    name: "Muhammad Adeel Shakir",
    role: "Co-Founder & CTO",
    expertise: "Data Science · Software Engineering · AI",
    imageSrc: "/team/muhammad-adeel-shakir.jpg",
  },
  {
    name: "Susanne",
    role: "Co-Founder",
    imageSrc: "/team/susanne.jpg",
  },
];

export function TeamSection() {
  return (
    <section
      id="team"
      className={cn(
        "relative scroll-mt-24 overflow-hidden border-t border-border/40 bg-background sm:scroll-mt-28",
        design.section.y
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(ellipse 55% 36% at 50% 4%, rgb(31 122 99 / 0.12), transparent 68%), radial-gradient(ellipse 34% 28% at 82% 22%, rgb(74 222 155 / 0.08), transparent 72%)",
        }}
      />
      <div className={cn(design.page.marketing, "relative text-center")}>
        <div className="relative mx-auto max-w-4xl px-6 py-8 sm:px-10 sm:py-10">
          <div
            className="pointer-events-none absolute inset-0 rounded-[50%] border border-primary/10 bg-background/20"
            aria-hidden
          />
          <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            OUR TEAM
          </p>
          <SectionTitle className="relative mx-auto mt-4 max-w-3xl">
            Built by a team combining business, ESG &amp; technology.
          </SectionTitle>
        </div>
        <Subtitle className="mx-auto mt-6 max-w-2xl">
          We bring together complementary expertise to make ESG data collection
          and reporting simpler for SMEs.
        </Subtitle>

        <ul className="mx-auto mt-10 grid max-w-5xl gap-6 text-left sm:mt-14 md:grid-cols-3 md:gap-8">
          {founders.map((founder) => (
            <li
              key={founder.name}
              className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-premium transition-[border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-premium-hover motion-reduce:transform-none"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-secondary via-background to-accent">
                <Image
                  src={founder.imageSrc}
                  alt={`${founder.name} portrait`}
                  fill
                  sizes="(min-width: 1024px) 320px, (min-width: 768px) 30vw, calc(100vw - 3rem)"
                  className="object-cover"
                  style={{ objectPosition: founder.imagePosition ?? "center" }}
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold leading-snug text-foreground">
                      {founder.name}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-primary">
                      {founder.role}
                    </p>
                  </div>
                  <span
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/70 text-muted-foreground shadow-sm"
                    aria-label={`LinkedIn profile for ${founder.name} to be added`}
                    aria-disabled="true"
                    title="LinkedIn URL placeholder"
                  >
                    <span className="text-xs font-bold leading-none" aria-hidden>
                      in
                    </span>
                  </span>
                </div>
                {founder.expertise ? (
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {founder.expertise}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
