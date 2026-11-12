import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const reference = JSON.parse(readFileSync(resolve("docs/security/STEP-7R13-CURRENT-STATE-REFERENCE.json"), "utf8"));
const sql = readFileSync(resolve("docs/security/STEP-7R13-BASELINE-DRIFT-PREFLIGHT.sql"), "utf8");
const embedded = sql.match(/\$snapshots\$([\s\S]*?)\$snapshots\$/);
assert.ok(embedded);

test("all six user-supplied current snapshots are embedded unchanged and unapproved", () => {
  assert.deepEqual(JSON.parse(embedded[1]), reference.policies);
  assert.equal(reference.policies.length, 6);
  assert.equal(new Set(reference.policies.map((p: { policy_name: string }) => p.policy_name)).size, 6);
  assert.equal(reference.execution_approved, false);
  assert.equal(reference.historical_provenance_verified, false);
  for (const policy of reference.policies) {
    assert.deepEqual(policy.roles, ["authenticated"]);
    assert.equal(policy.command, "r");
    assert.equal(policy.permissive, true);
    assert.equal(policy.with_check_sql, null);
    assert.equal(typeof policy.using_sql, "string");
  }
});

const pattern = sql.match(/\$lex\$([\s\S]*?)\$lex\$/)?.[1];
assert.ok(pattern);
// Offline lexical model only. PostgreSQL ARE/regexp_matches is not executed.
const lexical = new RegExp(pattern.replaceAll("[^[:space:]]", "\\S"), "g");
const tokens = (expression: string) => [...expression.matchAll(lexical)].map((m) => m[0]);

test("line wrapping and punctuation whitespace compare without altering literals", () => {
  assert.deepEqual(tokens("public.is_active_organization_member(id)"), tokens("public . is_active_organization_member (\n id\t)"));
  assert.deepEqual(tokens("ARRAY['owner'::text, 'admin'::text]"), tokens("ARRAY [ 'owner' :: text ,\n'admin' :: text ]"));
});
for (const [before, after] of [
  ["'documents'", "'documents '"], ["'a  b'", "'a b'"],
  ['"a  b"', '"a b"'], ["owner", "own er"], ["a<=b", "a< =b"],
  ["a AND b", "a OR b"], ["document.id", "other.id"],
  ["'owner'::text", "'member'::text"], ["f(id)", "f(other_id)"],
]) {
  test(`token comparison detects security-relevant drift: ${before} -> ${after}`, () => {
    assert.notDeepEqual(tokens(before), tokens(after));
  });
}

test("NULL check, exact metadata, missing policies and extra permissive policies fail closed", () => {
  assert.ok(sql.includes("p.actual_check is not distinct from p.with_check_sql"));
  assert.ok(sql.includes("p.actual_roles is not distinct from p.expected_roles"));
  assert.ok(sql.includes("p.polcmd::text is not distinct from p.command"));
  assert.ok(sql.includes("p.polpermissive is not distinct from p.permissive"));
  assert.ok(sql.includes("policy_oid is not null and using_tokens_equal and check_tokens_equal and roles_equal and command_equal and mode_equal"));
  assert.ok(sql.includes("p.polpermissive and p.polname <> t.policy_name then 'FAIL'"));
});

test("preflight stays read-only and preserves platform, helper and privilege checks", () => {
  const operational = sql.replace(/--[^\r\n]*/g, "");
  assert.match(operational, /begin transaction isolation level repeatable read read only/i);
  assert.match(operational.trim(), /rollback;$/i);
  assert.doesNotMatch(operational, /^\s*(alter|create|drop|grant|revoke|insert|update|delete|truncate|lock|execute|do)\b/im);
  // The embedded reference contains policy SQL as DATA, never executable SQL.
  const executable = operational
    .replace(/\$snapshots\$[\s\S]*?\$snapshots\$/g, "''")
    .replace(/\$lex\$[\s\S]*?\$lex\$/g, "''")
    .replace(/'(?:[^']|'')*'/g, "''");
  assert.doesNotMatch(executable, /\b(?:from|join)\s+(?:public\.|auth\.users|storage\.objects)/i);
  assert.ok(sql.includes("(c.policy_grants -> 'postgres') @> '[\"storage.objects\"]'::jsonb"));
  assert.ok(sql.includes("'UPDATE,DELETE,TRUNCATE'"));
  assert.ok(sql.includes("unapplied_no_application_grants_baseline"));
  assert.ok(sql.includes("when h.expected_body_md5 is null then 'REVIEW'"));
  assert.ok(sql.includes("execution_approved', false"));
});

test("migration and application gate remain untouched", () => {
  const migration = readFileSync(resolve("supabase/migrations/20261109010000_authenticated_read_reconciliation.sql"));
  assert.equal(createHash("sha256").update(migration).digest("hex").toUpperCase(), "B435B165A360C8CAED32B74794A6FBCA3BBAE29C1702F0B183462DDCF31A4087");
  assert.ok(readFileSync(resolve("src/lib/security/database-verification.ts"), "utf8").includes("DATABASE_READS_VERIFIED = false"));
});
