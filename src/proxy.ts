import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicAuthConfiguration } from "@/lib/supabase/public-config";
import { propagateAuthCookies } from "@/lib/auth/cookies";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  try {
    const { url, key } = getPublicAuthConfiguration();
    const client = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values, headers) {
          propagateAuthCookies(values, headers,
            (name, value) => request.cookies.set(name, value),
            ({ name, value, options }) => response.cookies.set(name, value, options),
            (name, value) => response.headers.set(name, value));
          // Forward refreshed cookies to the downstream render as well.
          const next = NextResponse.next({ request });
          for (const cookie of response.cookies.getAll()) next.cookies.set(cookie);
          for (const name of ["Cache-Control", "Expires", "Pragma"]) {
            const value = response.headers.get(name);
            if (value) next.headers.set(name, value);
          }
          response = next;
        },
      },
    });
    await client.auth.getUser();
  } catch {
    // No demo or privileged fallback. Protected rendering independently verifies.
  }
  return response;
}

export const config = {
  matcher: ["/login", "/register", "/auth/:path*", "/dashboard/:path*", "/documents/:path*", "/upload/:path*", "/processing/:path*", "/validation/:path*", "/reports/:path*", "/settings/:path*", "/onboarding/:path*"],
};
