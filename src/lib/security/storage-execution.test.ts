import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const route = readFileSync(resolve("docs/security/STEP-7R10-EXECUTION-ROUTE-PREFLIGHT.sql"), "utf8");
const baseline = readFileSync(resolve("docs/security/STEP-7R10-POLICY-BASELINE-REVIEW.sql"), "utf8");
const review = readFileSync(resolve("docs/security/STEP-7R10-REVIEW.md"), "utf8");

for (const [name, source] of [["route", route], ["baseline", baseline]]) {
  test(`${name} inspection remains strictly read-only`, () => {
    const sql = source.replace(/--[^\r\n]*/g, "");
    assert.match(sql, /begin transaction isolation level repeatable read read only/i);
    assert.match(sql.trim(), /rollback;$/i);
    assert.doesNotMatch(sql, /^\s*(alter|grant|revoke|create|drop|insert|update|delete|truncate|execute|do|lock)\b/im);
    assert.doesNotMatch(sql, /^\s*(?:set\s+(?:local\s+)?role\b|reset\s+role\b)/im);
    assert.doesNotMatch(sql, /\b(?:from|join)\s+(?:auth\.users|public\.|storage\.objects)/i);
  });
}

test("role preflight distinguishes session/current and PostgreSQL version-specific SET authority", () => {
  assert.ok(route.includes("r.rolname = session_user"));
  assert.ok(route.includes("r.rolname = current_user"));
  assert.ok(route.includes("server_version_num')::integer >= 160000"));
  assert.ok(route.includes("then pg_catalog.pg_has_role(e.oid, t.oid, 'SET')"));
  assert.ok(route.includes("else pg_catalog.pg_has_role(e.oid, t.oid, 'MEMBER') end"));
  assert.ok(route.includes("atomic_switch_and_explicit_restore_possible"));
});

test("baseline export requires independently approved expressions AND roles", () => {
  assert.equal((baseline.match(/null::text, null::text, null::text\[\], false/g) ?? []).length, 6);
  assert.ok(baseline.includes("actual_using_sql"));
  assert.ok(baseline.includes("not independently_approved or approved_using_sql is null or approved_roles is null"));
  assert.ok(baseline.includes("actual_roles is not distinct from approved_roles"));
  assert.ok(review.includes("not with the desired replacement predicates from R8"));
});

test("blocked route preserves original migration and closed gate", () => {
  const migration = readFileSync(resolve("supabase/migrations/20261109010000_authenticated_read_reconciliation.sql"));
  assert.equal(createHash("sha256").update(migration).digest("hex").toUpperCase(), "B435B165A360C8CAED32B74794A6FBCA3BBAE29C1702F0B183462DDCF31A4087");
  assert.ok(readFileSync(resolve("src/lib/security/database-verification.ts"), "utf8").includes("DATABASE_READS_VERIFIED = false"));
  assert.ok(review.includes("Current status: BLOCKED"));
  assert.ok(review.includes("No executable role-switch migration is generated now"));
});

test("fallback plan narrows Storage before public grants and does not invent supported capability", () => {
  assert.ok(review.includes("STORAGE-FIRST split"));
  assert.ok(review.includes("Do not commit PUBLIC GRANTS FIRST"));
  assert.ok(review.includes("global atomicity\ncannot be claimed"));
  assert.ok(review.includes("No safe project-supported route has yet been established"));
});
