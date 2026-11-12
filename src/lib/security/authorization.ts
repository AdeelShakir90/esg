/**
 * Server-side policy only: no identity verification or database access occurs here.
 * Callers must supply a server-verified user and freshly loaded memberships.
 * Never construct this context from form fields, cookies, or client role claims.
 */
export type OrganizationRole = "owner" | "reviewer" | "member";

export function isOrganizationRole(role: string): role is OrganizationRole {
  return role === "owner" || role === "reviewer" || role === "member";
}

export type AuthorizationContext = {
  userId: string | null;
  memberships: readonly {
    userId: string;
    organizationId: string;
    role: string;
    status: string;
  }[];
};

export type AuthorizationDecision =
  | { allowed: true }
  | { allowed: false; status: 401 | 403 | 404 };

function activeRole(context: AuthorizationContext, organizationId: string) {
  const matches = context.memberships.filter(
    (membership) =>
      membership.userId === context.userId &&
      membership.organizationId === organizationId
  );
  // Duplicate/ambiguous membership data fails closed, including mixed statuses.
  if (matches.length !== 1 || matches[0].status !== "active") return null;
  const role = matches[0].role;
  if (!isOrganizationRole(role) || role === "member") return null;
  return role;
}

export function authorizeOrganization(
  context: AuthorizationContext,
  organizationId: string | null,
  operation: "read" | "upload"
): AuthorizationDecision {
  if (!context.userId) return { allowed: false, status: 401 };
  if (operation !== "read" && operation !== "upload") {
    return { allowed: false, status: 403 };
  }
  const role = organizationId ? activeRole(context, organizationId) : null;
  if (!role || (operation === "upload" && role !== "owner")) {
    return { allowed: false, status: 403 };
  }
  return { allowed: true };
}

export function authorizeDocument(
  context: AuthorizationContext,
  document: { organizationId: string | null } | null,
  operation: "read" | "process"
): AuthorizationDecision {
  if (!context.userId) return { allowed: false, status: 401 };
  const role = document?.organizationId
    ? activeRole(context, document.organizationId)
    : null;
  // Conceal missing, foreign and unowned documents before considering the action.
  if (!role) return { allowed: false, status: 404 };
  if (
    (operation !== "read" && operation !== "process") ||
    (operation === "process" && role !== "owner")
  ) {
    return { allowed: false, status: 403 };
  }
  return { allowed: true };
}
