/** Injectable Auth-only port; no database, Storage, admin or environment access. */
export type AuthPort = {
  signInWithPassword(input: { email: string; password: string }): Promise<{ error: unknown }>;
  signUp(input: { email: string; password: string; options: { emailRedirectTo: string; data: { name: string } } }): Promise<{ error: unknown }>;
  signOut(): Promise<{ error: unknown }>;
  getUser(): Promise<{ data: { user: { id: string } | null }; error: unknown }>;
  exchangeCodeForSession(code: string): Promise<{ error: unknown }>;
  verifyOtp(input: { token_hash: string; type: "signup" | "email" }): Promise<{ error: unknown }>;
};

export async function loginWithPassword(auth: AuthPort, email: string, password: string) {
  if (!email.trim() || !password) return false;
  const { error } = await auth.signInWithPassword({ email: email.trim(), password });
  if (error) return false;
  const verified = await auth.getUser();
  return !verified.error && !!verified.data.user;
}

export async function registerWithEmail(auth: AuthPort, name: string, email: string, password: string, origin: string) {
  if (!name.trim() || !email.trim() || password.length < 8) return false;
  const { error } = await auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${origin}/auth/confirm`, data: { name: name.trim() } } });
  return !error;
}

export async function confirmEmail(auth: AuthPort, params: URLSearchParams) {
  const code = params.get("code");
  const token = params.get("token_hash");
  const type = params.get("type");
  if (!!code === !!token) return false;
  const result = code
    ? await auth.exchangeCodeForSession(code)
    : token && (type === "signup" || type === "email")
      ? await auth.verifyOtp({ token_hash: token, type })
      : null;
  if (!result || result.error) return false;
  const verified = await auth.getUser();
  return !verified.error && !!verified.data.user;
}

export async function signOutSession(auth: AuthPort) {
  const { error } = await auth.signOut();
  return !error;
}
