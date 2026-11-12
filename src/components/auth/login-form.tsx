"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ContentCard } from "@/components/primitives/content-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/auth/actions";
import { safeAuthRedirect } from "@/lib/auth/policy";
import { design } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const searchParams = useSearchParams();
  const nextHref = safeAuthRedirect(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const em = email.trim();
    if (!em || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setPending(true);
    try { const result = await login(em, password, nextHref); setError(result.error); }
    catch { setError("Sign-in could not be completed. Please try again."); }
    finally { setPending(false); }
  }

  return (
    <ContentCard
      elevation="lg"
      className="w-full max-w-md border-border/50 bg-card/95 shadow-premium backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500"
    >
      <div className="flex flex-col gap-6 p-6 sm:p-8">
        <div className="text-center">
          <h1 className={design.type.pageTitle}>Sign in</h1>
          <p className={cn(design.type.subtitle, "mt-2")}>
            Sign in with your confirmed account.
          </p>
        </div>

        {searchParams.get("confirmation") === "failed" ? <p role="alert">Email confirmation failed or expired. Please try your confirmation link again.</p> : null}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.at"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} size="lg" className="mt-1 w-full shadow-premium">
            {pending ? "Signing in…" : "Log in"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link
            href="/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </ContentCard>
  );
}
