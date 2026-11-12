import { redirect } from "next/navigation";
import { getVerifiedUser } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";
import { ReadScopeBoundary } from "./read-scope-boundary";

/** UX/session boundary only. Existing APIs/actions are NOT secured by this gate. */
export async function AuthGate() {
  const user = await getVerifiedUser();
  if (!user) redirect("/login");
  // Do not render workspace children until API authorization exists.
  return (
    <ReadScopeBoundary key={user.id} userId={user.id}>
    <main className="mx-auto max-w-xl space-y-4 p-8">
      <h1 className="text-2xl font-semibold">Signed in</h1>
      <p>Workspace access is temporarily unavailable while organization security is completed.</p>
      <SignOutButton />
    </main>
    </ReadScopeBoundary>
  );
}
