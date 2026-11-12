import { NextResponse, type NextRequest } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/server";
import { confirmEmail } from "@/lib/auth/service";
import { confirmationOrigin, safeAuthRedirect } from "@/lib/auth/policy";

export async function GET(request: NextRequest) {
  let destination = "/login?confirmation=failed";
  // Trust configured origin, never request Host / forwarded headers.
  let origin: string;
  try { origin = confirmationOrigin(process.env.NEXT_PUBLIC_SITE_URL); }
  catch { return new NextResponse("Confirmation is unavailable.", { status: 503, headers: { "Cache-Control": "no-store" } }); }
  try {
    const client = await createAuthServerClient();
    if (await confirmEmail(client.auth, request.nextUrl.searchParams)) {
      destination = safeAuthRedirect(request.nextUrl.searchParams.get("next"));
    }
  } catch { /* Fail closed without logging tokens or provider responses. */ }
  const response = NextResponse.redirect(new URL(destination, origin), 303);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
