import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { design } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const footerLinks = [
  {
    title: "Product",
    items: [
      { label: "How it works", href: "/#how" },
      { label: "Why envario", href: "/#why" },
      { label: "Upload documents", href: "/upload" },
    ],
  },
  {
    title: "Company",
    items: [
      { label: "About", href: "#" },
      { label: "Contact", href: "#" },
      { label: "Privacy", href: "#" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/80 bg-muted/30">
      <div className={cn(design.page.marketing, "py-12 lg:py-16")}>
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="lg:col-span-2">
            <Logo />
            <p className={cn("mt-4 max-w-sm", design.type.footerMuted)}>
              AI-powered ESG reporting built for Austrian SMEs. Turn scattered data
              into audit-ready reports in hours, not weeks.
            </p>
          </div>
          {footerLinks.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {group.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-foreground/80 transition-colors duration-200 hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-border/60 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} envario. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Made for Austria · CSRD-aligned workflows (demo)
          </p>
        </div>
      </div>
    </footer>
  );
}
