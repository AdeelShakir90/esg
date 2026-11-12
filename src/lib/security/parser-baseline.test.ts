import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name: string) => readFileSync(`docs/security/${name}`, "utf8");
const reference = JSON.parse(read("STEP-7R15-HELPER-CURRENT-STATE-REFERENCE.json"));
const drift = read("STEP-7R15-HELPER-DRIFT-PREFLIGHT.sql");
const parser = read("STEP-7R15-PARSER-READONLY-TEST.sql");
const operational = (sql: string) => sql
  .replace(/\$helper_reference\$[\s\S]*?\$helper_reference\$/g, "''")
  .replace(/'(?:[^']|'')*'/g, "''")
  .replace(/--[^\r\n]*/g, "");

test("current-state reference is embedded exactly and cannot approve execution", () => {
  assert.deepEqual(JSON.parse(drift.split("$helper_reference$")[1]), reference.helpers);
  assert.equal(reference.baseline_approved, false);
  assert.equal(reference.historical_provenance_verified, false);
  assert.equal(reference.source_bytes_verified, false);
  assert.equal(reference.migration_execution_approved, false);
  assert.equal(reference.helpers.length, 3);
});

test("reported fingerprints are preserved despite unresolved transcription bytes", () => {
  assert.deepEqual(reference.helpers.map((h: { reported_definition_md5: string }) => h.reported_definition_md5), [
    "cdc03d374173e351092dff040c30edf6", "f1b147b487ffc4b7239b7a65627b5f87", "7f7bc2ad759c7dde9b2b68cf03a1af6a",
  ]);
  for (const h of reference.helpers) {
    for (const newline of ["\n", "\r\n"]) {
      for (const tail of ["", newline]) {
        const text = h.definition_text.replace(/\r?\n/g, newline) + tail;
        assert.notEqual(createHash("md5").update(text).digest("hex"), h.reported_definition_md5);
      }
    }
  }
  assert.match(drift, /transcript_and_line_ending_uncertainty/);
  assert.match(drift, /case when oid is null then 'FAIL' else 'REVIEW' end/);
});

for (const [name, sql] of [["parser", parser], ["drift", drift]]) {
  test(`${name} SQL stays read-only with explicit rollback`, () => {
    const code = operational(sql);
    assert.match(code, /begin transaction isolation level repeatable read read only/i);
    assert.match(code.trim(), /rollback;$/i);
    assert.doesNotMatch(code, /^\s*(create|alter|drop|grant|revoke|insert|update|delete|truncate|execute|do|lock|load)\b/im);
    assert.doesNotMatch(code, /\b(?:from|join)\s+(?:public\.|auth\.users|storage\.objects)/i);
    assert.doesNotMatch(code, /(?:is_active_organization_member|has_active_organization_role)\s*\(/i);
    if (name === "drift") assert.doesNotMatch(code, /document_storage_organization_id\s*\(/i);
  });
}

test("parser suite covers 31 synthetic cases without masking exceptions", () => {
  assert.equal((parser.match(/^  \('[a-z0-9_]+',/gm) ?? []).length, 31);
  for (const id of ["null_input", "empty_input", "extra_segments", "non_pdf", "unicode_prefix", "newline_after_prefix", "bare_uuid"])
    assert.ok(parser.includes(`('${id}',`));
  assert.match(parser, /observed as materialized/i);
  assert.match(parser, /public\.document_storage_organization_id\(s\.input_path\)/);
  assert.match(parser, /actual_uuid is not distinct from expected_uuid::uuid/);
  assert.match(parser, /'authorization_evaluated', false/);
  assert.doesNotMatch(operational(parser), /\bexception\b/i);
});

// JavaScript model checks the transcribed ASCII grammar only; it is not a
// PostgreSQL execution, collation check, or proof of RLS/Storage authorization.
const pattern = reference.helpers[0].definition_text.match(/'([\^][^']+\$)'/)[1];
const grammar = new RegExp(pattern);
for (const [prefix, accepted] of [
  ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", true],
  ["AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA", true],
  ["aaaaaaaa-aaaa-1aaa-9aaa-aaaaaaaaaaaa", true],
  ["aaaaaaaa-aaaa-8aaa-baaa-aaaaaaaaaaaa", true],
  ["aaaaaaaa-aaaa-0aaa-8aaa-aaaaaaaaaaaa", false],
  ["aaaaaaaa-aaaa-9aaa-8aaa-aaaaaaaaaaaa", false],
  ["aaaaaaaa-aaaa-4aaa-caaa-aaaaaaaaaaaa", false],
  ["00000000-0000-0000-0000-000000000000", false],
  ["legacy", false], ["", false], ["áaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", false],
] as const) {
  test(`offline ASCII grammar: ${prefix || "empty"}`, () => assert.equal(grammar.test(prefix), accepted));
}

test("migration and disabled read gate are preserved", () => {
  const migration = readFileSync("supabase/migrations/20261109010000_authenticated_read_reconciliation.sql");
  assert.equal(createHash("sha256").update(migration).digest("hex").toUpperCase(),
    "B435B165A360C8CAED32B74794A6FBCA3BBAE29C1702F0B183462DDCF31A4087");
  assert.match(readFileSync("src/lib/security/database-verification.ts", "utf8"), /DATABASE_READS_VERIFIED = false/);
});
