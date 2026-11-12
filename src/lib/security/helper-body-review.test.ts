import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const source = readFileSync(resolve("docs/security/STEP-7R14-HELPER-BODY-REVIEW.sql"), "utf8");
const review = readFileSync(resolve("docs/security/STEP-7R14-REVIEW.md"), "utf8");
const code = source.replace(/--[^\r\n]*/g, "").replace(/'(?:[^']|'')*'/g, "''");

test("targeted helper export is read-only and never invokes helpers or reads user data", () => {
  assert.match(code, /begin transaction isolation level repeatable read read only/i);
  assert.match(code.trim(), /rollback;$/i);
  assert.doesNotMatch(code, /^\s*(create|alter|drop|grant|revoke|insert|update|delete|truncate|execute|do|lock|load)\b/im);
  assert.doesNotMatch(code, /\b(?:from|join)\s+(?:public\.|auth\.users|storage\.objects)/i);
  assert.doesNotMatch(code, /\b(?:public\.)?(?:is_active_organization_member|has_active_organization_role|document_storage_organization_id)\s*\(/i);
  assert.doesNotMatch(code, /auth\.uid\s*\(/i);
  assert.ok(source.includes("pg_catalog.pg_get_functiondef(p.oid)"));
});

test("exactly three absent original references remain explicitly unapproved", () => {
  assert.equal((source.match(/null::text, null::text, false/g) ?? []).length, 3);
  assert.ok(source.includes("when not h.reference_approved or (h.reviewed_original_definition is null and h.reviewed_original_md5 is null) then 'REVIEW'"));
  assert.ok(source.includes("h.observed_definition = h.reviewed_original_definition"));
  assert.ok(source.includes("md5(h.observed_definition) = h.reviewed_original_md5"));
  assert.ok(source.includes("original_definitions_available_locally', false"));
});

test("structural, privilege and semantic checks remain distinct", () => {
  assert.ok(source.includes("h.prosecdef is distinct from h.expected_definer"));
  assert.ok(source.includes("h.provolatile::text is distinct from h.expected_volatility"));
  assert.ok(source.includes("h.setting_count = 1"));
  assert.ok(source.includes("has_function_privilege(r.oid, h.oid, 'EXECUTE')"));
  assert.ok(source.includes("'mandatory_manual_body_review',"));
  assert.ok(source.includes("Text markers are navigation aids only"));
  assert.ok(review.includes("Do not falsely\n  certify it as owner/reviewer-only"));
});

test("parser review distinguishes Storage CASE protection from direct invocation safety", () => {
  assert.ok(review.includes("A raw split_part(..., '/', 1)::uuid can throw"));
  assert.ok(review.includes("does NOT make direct\n  RPC/parser calls safe"));
  assert.ok(review.includes("IMMUTABLE is incompatible with"));
  assert.ok(review.includes("No test call is run"));
});

test("private source handling, explicit current-state adoption and unchanged gates are required", () => {
  assert.ok(review.includes("Keep the CSV private"));
  assert.ok(review.includes("Do not mark the R13 helper-body rows PASS"));
  assert.ok(review.includes("No full original CREATE\nFUNCTION definitions"));
  assert.ok(readFileSync(resolve("src/lib/security/database-verification.ts"), "utf8").includes("DATABASE_READS_VERIFIED = false"));
  const migration = readFileSync(resolve("supabase/migrations/20261109010000_authenticated_read_reconciliation.sql"));
  assert.equal(createHash("sha256").update(migration).digest("hex").toUpperCase(), "B435B165A360C8CAED32B74794A6FBCA3BBAE29C1702F0B183462DDCF31A4087");
});
