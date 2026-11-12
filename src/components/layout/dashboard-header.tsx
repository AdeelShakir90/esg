"use client";

import { useEffect, useState } from "react";
import { Bell, LogOut, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getUserInitials,
} from "@/lib/auth-storage";
import { logout as signOut, verifiedProfile } from "@/lib/auth/actions";
import { design } from "@/lib/design-tokens";

/**
 * Dashboard top toolbar: search, notifications, profile, logout (static demo).
 */
export function DashboardHeader() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    void verifiedProfile().then((profile) => setEmail(profile?.email ?? "")).catch(() => setEmail(""));
  }, []);

  const initials = email ? getUserInitials(email) : "U";

  async function logout() {
    await signOut();
  }

  return (
    <header className={design.header.toolbar}>
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 lg:max-w-none">
        <div className="relative hidden min-w-0 flex-1 md:block md:max-w-md lg:max-w-lg">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search documents, reports, metrics…"
            className="border-border/60 bg-muted/25 pl-9 transition-shadow duration-200 focus-visible:shadow-soft"
            readOnly
            aria-label="Search (demo)"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="shrink-0 md:hidden"
          aria-label="Search (demo)"
        >
          <Search className="size-4" />
        </Button>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="relative border-border/70 shadow-sm"
            aria-label="Notifications (demo)"
          >
            <Bell className="size-4" />
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary ring-2 ring-background" />
          </Button>
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-full border border-border/60 bg-gradient-to-br from-primary/18 via-primary/10 to-secondary text-sm font-semibold text-primary shadow-sm transition-[transform,box-shadow] duration-200 ease-out hover:scale-[1.04] hover:shadow-soft"
            title={email || "Signed in"}
            aria-label="Profile (demo)"
          >
            {initials}
          </button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden border-border/70 sm:inline-flex"
            onClick={logout}
          >
            <LogOut className="mr-1.5 size-4" aria-hidden />
            Log out
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="border-border/70 sm:hidden"
            onClick={logout}
            aria-label="Log out"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
