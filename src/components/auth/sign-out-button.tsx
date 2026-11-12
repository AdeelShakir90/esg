"use client";

import { useState } from "react";
import { logout } from "@/lib/auth/actions";

export function SignOutButton() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return <div>
    <button disabled={pending} onClick={async () => {
      setPending(true);
      try { const result = await logout(); setError(result.error); }
      catch { setError("Sign-out could not be completed. Please try again."); }
      finally { setPending(false); }
    }}>{pending ? "Signing out…" : "Sign out"}</button>
    {error ? <p role="alert">{error}</p> : null}
  </div>;
}
