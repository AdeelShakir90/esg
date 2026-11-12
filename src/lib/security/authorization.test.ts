import assert from "node:assert/strict";
import test from "node:test";

import {
  authorizeDocument,
  authorizeOrganization,
  isOrganizationRole,
  type AuthorizationContext,
  type AuthorizationDecision,
} from "./authorization";

const allow: AuthorizationDecision = { allowed: true };
const deny = (status: 401 | 403 | 404): AuthorizationDecision => ({ allowed: false, status });
const membership = (role: string, status = "active", userId = "user-a") => ({
  userId, organizationId: "org-a", role, status,
});

const callers: {
  name: string;
  context: AuthorizationContext;
  read: AuthorizationDecision;
  write: AuthorizationDecision;
}[] = [
  { name: "anonymous", context: { userId: null, memberships: [] }, read: deny(401), write: deny(401) },
  { name: "owner", context: { userId: "user-a", memberships: [membership("owner")] }, read: allow, write: allow },
  { name: "reviewer", context: { userId: "user-a", memberships: [membership("reviewer")] }, read: allow, write: deny(403) },
  { name: "active member", context: { userId: "user-a", memberships: [membership("member")] }, read: deny(403), write: deny(403) },
  { name: "suspended member", context: { userId: "user-a", memberships: [membership("member", "suspended")] }, read: deny(403), write: deny(403) },
  { name: "suspended owner", context: { userId: "user-a", memberships: [membership("owner", "suspended")] }, read: deny(403), write: deny(403) },
  { name: "suspended reviewer", context: { userId: "user-a", memberships: [membership("reviewer", "suspended")] }, read: deny(403), write: deny(403) },
  { name: "outsider", context: { userId: "user-a", memberships: [] }, read: deny(403), write: deny(403) },
  { name: "another user's owner membership", context: { userId: "user-a", memberships: [membership("owner", "active", "user-b")] }, read: deny(403), write: deny(403) },
  { name: "unknown elevated role", context: { userId: "user-a", memberships: [membership("admin")] }, read: deny(403), write: deny(403) },
  { name: "unknown status", context: { userId: "user-a", memberships: [membership("owner", "pending")] }, read: deny(403), write: deny(403) },
  { name: "duplicate role escalation", context: { userId: "user-a", memberships: [membership("reviewer"), membership("owner")] }, read: deny(403), write: deny(403) },
  { name: "suspension override attempt", context: { userId: "user-a", memberships: [membership("owner", "suspended"), membership("owner")] }, read: deny(403), write: deny(403) },
  { name: "anonymous with owner data", context: { userId: null, memberships: [membership("owner")] }, read: deny(401), write: deny(401) },
];

test("member is recognized without acquiring owner or reviewer privileges", () => {
  assert.equal(isOrganizationRole("member"), true);
  assert.equal(isOrganizationRole("admin"), false);
});

for (const caller of callers) {
  for (const operation of ["read", "upload"] as const) {
    test(`${caller.name}: organization ${operation}`, () => {
      assert.deepEqual(authorizeOrganization(caller.context, "org-a", operation), operation === "read" ? caller.read : caller.write);
      const inaccessible = deny(caller.context.userId ? 403 : 401);
      assert.deepEqual(authorizeOrganization(caller.context, "org-b", operation), inaccessible);
      assert.deepEqual(authorizeOrganization(caller.context, null, operation), inaccessible);
    });
  }
  for (const operation of ["read", "process"] as const) {
    test(`${caller.name}: document ${operation}, visibility before permission`, () => {
      const decision = operation === "read" ? caller.read : caller.write;
      const expected = !caller.read.allowed
        ? deny(caller.context.userId ? 404 : 401)
        : decision;
      assert.deepEqual(authorizeDocument(caller.context, { organizationId: "org-a" }, operation), expected);
      for (const document of [null, { organizationId: null }, { organizationId: "" }, { organizationId: "org-b" }]) {
        assert.deepEqual(authorizeDocument(caller.context, document, operation), deny(caller.context.userId ? 404 : 401));
      }
    });
  }
}

test("client role claims do not elevate a server-loaded reviewer membership", () => {
  const context = { userId: "user-a", memberships: [membership("reviewer")], role: "owner", organizationId: "org-b" };
  assert.deepEqual(authorizeOrganization(context, "org-a", "upload"), deny(403));
  assert.deepEqual(authorizeDocument(context, { organizationId: "org-a" }, "process"), deny(403));
  assert.deepEqual(authorizeDocument(context, { organizationId: "org-b" }, "process"), deny(404));
});

test("an active owner may read and process documents of another active organization membership", () => {
  const context = { userId: "user-a", memberships: [membership("reviewer"), { ...membership("owner"), organizationId: "org-b" }] };
  assert.deepEqual(authorizeDocument(context, { organizationId: "org-b" }, "process"), allow);
  assert.deepEqual(authorizeDocument(context, { organizationId: "org-a" }, "process"), deny(403));
  assert.deepEqual(context.memberships[0], membership("reviewer"));
});
