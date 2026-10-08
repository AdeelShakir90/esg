import { withMvpApiAccess } from "@/lib/esg/mvp-access";
import {
  ValidationDataError,
  type ValidationDataErrorCode,
} from "@/lib/esg/validation";
import { getValidationData } from "@/lib/esg/validation-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function json(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  return Response.json(data, { ...init, headers });
}

async function handleAuthorizedGet(context: RouteContext) {
  const { id } = await context.params;

  try {
    return json({ validation: await getValidationData(id) });
  } catch (error) {
    if (error instanceof ValidationDataError) {
      return json(
        { error: { code: error.code, message: error.publicMessage } },
        { status: error.httpStatus }
      );
    }

    const code: ValidationDataErrorCode = "data_unavailable";
    console.error("Validation data request failed", {
      code,
      documentId: id,
    });
    return json(
      {
        error: {
          code,
          message: "The ESG validation data could not be loaded.",
        },
      },
      { status: 500 }
    );
  }
}

// This shared token protects controlled MVP testing only. It is not user or
// tenant authorization, and a document UUID is never treated as ownership.
export function GET(request: Request, context: RouteContext) {
  return withMvpApiAccess(
    request,
    process.env.MVP_API_ACCESS_TOKEN,
    () => handleAuthorizedGet(context)
  );
}
