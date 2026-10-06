import { timingSafeEqual } from "node:crypto";

const AUTHORIZATION_SCHEME = "Bearer ";

function unauthorizedResponse() {
  return Response.json(
    { error: "Unauthorized." },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
        "WWW-Authenticate": "Bearer",
      },
    }
  );
}

function tokensMatch(providedToken: string, configuredToken: string) {
  const provided = Buffer.from(providedToken, "utf8");
  const configured = Buffer.from(configuredToken, "utf8");

  return (
    provided.length === configured.length && timingSafeEqual(provided, configured)
  );
}

export async function withMvpApiAccess(
  request: Request,
  configuredToken: string | undefined,
  onAuthorized: () => Response | Promise<Response>
) {
  const expectedToken = configuredToken?.trim();
  const authorization = request.headers.get("authorization");
  const providedToken = authorization?.startsWith(AUTHORIZATION_SCHEME)
    ? authorization.slice(AUTHORIZATION_SCHEME.length).trim()
    : "";

  if (
    !expectedToken ||
    !providedToken ||
    !tokensMatch(providedToken, expectedToken)
  ) {
    return unauthorizedResponse();
  }

  return onAuthorized();
}
