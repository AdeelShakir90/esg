import type { CookieOptions } from "@supabase/ssr";

export type AuthCookie = { name: string; value: string; options: CookieOptions };

/** Refresh must update the downstream request and the outgoing response. */
export function propagateAuthCookies(
  cookies: AuthCookie[],
  headers: Record<string, string>,
  setRequestCookie: (name: string, value: string) => void,
  setResponseCookie: (cookie: AuthCookie) => void,
  setResponseHeader: (name: string, value: string) => void
) {
  for (const cookie of cookies) {
    setRequestCookie(cookie.name, cookie.value);
    setResponseCookie(cookie);
  }
  for (const [name, value] of Object.entries(headers)) setResponseHeader(name, value);
}
