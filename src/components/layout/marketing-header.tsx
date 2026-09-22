import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Header, HeaderMain } from "@/components/layout/header";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

const nav = [
  { label: "How it works", href: "/#how" },
  { label: "Why ESGsimplify", href: "/#why" },
  { label: "Team", href: "/#team" },
  { label: "Get started", href: "/#cta" },
] as const;

export function MarketingHeader() {
  return (
    <Header>
      <HeaderMain>
        <Logo />
        <nav
          className="hidden items-center gap-6 md:flex md:gap-8"
          aria-label="Main"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Get started
          </Link>
        </div>
      </HeaderMain>
    </Header>
  );
}
