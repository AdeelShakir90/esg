"use server";

import { redirect } from "next/navigation";
import { createAuthServerClient, getVerifiedUser } from "@/lib/supabase/server";
import { confirmationOrigin, safeAuthRedirect } from "./policy";
import { loginWithPassword, registerWithEmail, signOutSession } from "./service";

export async function login(email: string, password: string, next: string) {
  try {
    const client = await createAuthServerClient();
    if (!await loginWithPassword(client.auth, email, password)) return { error: "Unable to sign in. Check your credentials and email confirmation." };
  } catch {
    return { error: "Sign-in is unavailable. Please try again later." };
  }
  redirect(safeAuthRedirect(next));
}

export async function register(name: string, email: string, password: string) {
  try {
    const origin = confirmationOrigin(process.env.NEXT_PUBLIC_SITE_URL);
    const client = await createAuthServerClient();
    if (!await registerWithEmail(client.auth, name, email, password, origin)) return { error: "Unable to register. Use a valid email and a password of at least eight characters." };
    // Even if remote configuration auto-confirms signup, do not open a workspace.
    const { error } = await client.auth.signOut();
    if (error) return { error: "Registration could not be completed safely. Please try again later." };
    return { message: "If registration is available for this address, check your email to confirm your account." };
  } catch {
    return { error: "Registration is unavailable. Please try again later." };
  }
}

export async function logout() {
  try {
    const client = await createAuthServerClient();
    if (!await signOutSession(client.auth)) return { error: "Unable to sign out. Please try again." };
  } catch {
    return { error: "Unable to sign out. Please try again." };
  }
  redirect("/login");
}

export async function verifiedProfile() {
  const user = await getVerifiedUser();
  return user ? { email: user.email ?? "" } : null;
}
