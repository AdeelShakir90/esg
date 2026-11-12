"use client";

import { useState } from "react";
import Link from "next/link";

import { ContentCard } from "@/components/primitives/content-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { register } from "@/lib/auth/actions";
import { design } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const result = await register(name, email, password);
      setError(result.error ?? null);
      setMessage(result.message ?? null);
      setPassword("");
    } catch { setError("Registration could not be completed. Please try again."); }
    finally { setPending(false); }
  }

  return (
    <ContentCard
      elevation="lg"
      className="w-full max-w-md border-border/50 bg-card/95 shadow-premium backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500"
    >
      <div className="flex flex-col gap-6 p-6 sm:p-8">
        <div className="text-center">
          <h1 className={design.type.pageTitle}>Create account</h1>
          <p className={cn(design.type.subtitle, "mt-2")}>
            Confirm your email to finish creating your account.
          </p>
        </div>

        {message ? <p role="status">{message}</p> : null}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="register-name">Name</Label>
            <Input
              id="register-name"
              autoComplete="name"
              placeholder="Your name"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="register-email">Email</Label>
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.at"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="register-password">Password</Label>
            <Input
              id="register-password"
              type="password"
              minLength={8}
              autoComplete="new-password"
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
            {pending ? "Registering…" : "Register"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </ContentCard>
  );
}
