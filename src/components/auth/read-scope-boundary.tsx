"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

/** Key this boundary by the server-verified user:organization scope.
 * No persisted document cache. On identity/scope invalidation, unmount all data.
 */
export function ReadScopeBoundary({ userId, children }: { userId: string; children: ReactNode }) {
  const router = useRouter();
  const [invalidated, setInvalidated] = useState(false);
  useEffect(() => {
    const invalidate = () => {
      setInvalidated(true);
      router.refresh();
    };
    window.addEventListener("envario:organization-change", invalidate);
    const client = createAuthBrowserClient();
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || session?.user.id !== userId) invalidate();
    });
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("envario:organization-change", invalidate);
    };
  }, [router, userId]);
  return invalidated ? <p role="status">Session or organization changed. Reload to continue.</p> : children;
}
