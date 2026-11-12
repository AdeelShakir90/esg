import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicAuthConfiguration } from "./public-config";

/** Fresh per request. Read-only rendering relies on Proxy to persist refreshes. */
export async function createAuthServerClient(writableCookies = true) {
  const { url, key } = getPublicAuthConfiguration();
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        if (!writableCookies) return;
        for (const { name, value, options } of values) store.set(name, value, options);
      },
    },
  });
}

export async function getVerifiedUser() {
  try {
    const client = await createAuthServerClient(false);
    const { data, error } = await client.auth.getUser();
    return error ? null : data.user;
  } catch {
    return null;
  }
}
