import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve("docs/security/archived-migrations/20261109000000_reconcile_protected_read_roles.sql.txt"), "utf8");
const preflight = readFileSync(resolve("docs/security/STEP-7R7-PREFLIGHT.sql"), "utf8");
const review = readFileSync(resolve("docs/security/STEP-7R7-REVIEW.md"), "utf8");
// Static artifact/model checks only. These do not parse or execute PostgreSQL.
const withoutComments = (sql: string) => sql.replace(/--[^\r\n]*/g, "");

test("migration parses empty search_path values and verifies actual resolution", () => {
  assert.doesNotMatch(migration, /proconfig\s*@>/);
  assert.match(migration, /path_setting_count <> 1 or configured_path is null/);
  assert.ok(migration.includes(`not in ('', '""')`));
  assert.ok(migration.includes("pg_catalog.strpos(setting, '=') + 1"));
  assert.ok(migration.includes("pg_catalog.set_config('search_path', configured_path, true)"));
  assert.ok(migration.includes("pg_catalog.cardinality(pg_catalog.current_schemas(false)) <> 0"));
  assert.ok(migration.includes("pg_catalog.set_config('search_path', original_path, true)"));
});

for (const value of ["", '""', " \t", ' \t"" \n']) {
  test(`empty-path spelling accepted by the documented model: ${JSON.stringify(value)}`, () => {
    assert.ok(["", '""'].includes(value.trim()));
  });
}
for (const value of ["public", "nonexistent_schema", '"$user"', '" "', '"public"', '"", public', '""""']) {
  test(`nonempty/unrecognized path rejected even if unresolved: ${value}`, () => {
    assert.equal(["", '""'].includes(value.trim()), false);
  });
}

test("policy alteration narrows both predicate and effective role coverage", () => {
  assert.ok(migration.includes("pg_catalog.format('(%s) AND (%s)', old_predicate, target.new_predicate)"));
  assert.ok(migration.includes("into strict old_predicate"));
  assert.ok(migration.includes("'ALTER POLICY %I ON %s TO authenticated USING (%s)'"));
  assert.ok(migration.includes("case when role_oid = 0 then true"));
  assert.ok(migration.includes("pg_catalog.pg_has_role('authenticated'::regrole, role_oid, 'USAGE')"));
  assert.ok(migration.includes("polcmd = 'r' and polpermissive"));
  assert.ok(migration.includes("polcmd in ('r', '*')"));
  assert.ok(migration.includes("in access exclusive mode"));
  assert.equal((migration.match(/array\['owner', 'reviewer'\]::text\[\]/g) ?? []).length, 4);
});

test("both original Storage predicate and new casts stay inside canonical CASE", () => {
  assert.ok(migration.includes("CASE WHEN bucket_id = %L AND name ~* %L THEN (%s) ELSE false END"));
  assert.ok(migration.includes("combined_predicate\n      );"));
  assert.ok(migration.includes("d.storage_path = storage.objects.name"));
  assert.ok(migration.includes("d.organization_id = pg_catalog.split_part(storage.objects.name, '/', 1)::uuid"));
  assert.ok(migration.includes("d.id = pg_catalog.split_part(pg_catalog.split_part(storage.objects.name, '/', 2), '.', 1)::uuid"));
});

const org = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const doc = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const other = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const canonicalMatch = migration.match(/'(\^\[0-9a-f\][^'\r\n]+\$)'/);
assert.ok(canonicalMatch, "canonical regex must exist in the migration");
const canonical = new RegExp(canonicalMatch[1], "i");
function storageModel(name: string, document: { id: string; organizationId: string | null; storagePath: string } | null) {
  if (!canonical.test(name)) return false;
  const [organization, filename] = name.split("/");
  return !!document && document.storagePath === name &&
    document.organizationId?.toLowerCase() === organization.toLowerCase() &&
    document.id.toLowerCase() === filename.slice(0, -4).toLowerCase();
}

test("canonical Storage model binds both document ID and organization", () => {
  const name = `${org}/${doc}.pdf`;
  const metadata = { id: doc, organizationId: org, storagePath: name };
  assert.equal(storageModel(name, metadata), true);
  assert.equal(storageModel(name, { ...metadata, id: other }), false);
  assert.equal(storageModel(name, { ...metadata, organizationId: other }), false);
  assert.equal(storageModel(name, { ...metadata, organizationId: null }), false);
  assert.equal(storageModel(name, { ...metadata, storagePath: "different" }), false);
  assert.equal(storageModel(name, null), false);
});
for (const name of [`2026-10-01/${doc}.pdf`, `${org}/../${doc}.pdf`, `${org}/${doc}.pdf/extra`, `${org}/invalid.pdf`, `invalid/${doc}.pdf`, `${org}/${doc}.pdf?token=x`]) {
  test(`malformed or legacy Storage name rejected before parsing: ${name}`, () => {
    assert.equal(storageModel(name, { id: doc, organizationId: org, storagePath: name }), false);
  });
}

test("SQL artifacts do not add grants, write policies, data changes or metadata policy changes", () => {
  const sql = withoutComments(migration);
  assert.match(sql.trim(), /^begin;/i);
  assert.match(sql.trim(), /commit;$/i);
  assert.doesNotMatch(sql, /^\s*(grant|revoke|insert|update|delete|truncate|create|drop)\b/im);
  assert.doesNotMatch(sql, /created_by|organizations_select_active_member|memberships_select_same_organization/);
  assert.ok(sql.includes("has_function_privilege('authenticated', predicate_oid, 'EXECUTE')"));
  const readOnly = withoutComments(preflight);
  assert.match(readOnly, /begin transaction isolation level repeatable read read only/i);
  assert.match(readOnly.trim(), /rollback;$/i);
  assert.doesNotMatch(readOnly, /^\s*(alter|grant|revoke|insert|update|delete|truncate|create|drop)\b/im);
  assert.ok(preflight.includes("canonical_objects_matching_org_and_document"));
});

test("review distinguishes protected data correction from unresolved member metadata access", () => {
  assert.ok(review.includes("Minimal separate correction recommended before live reads"));
  assert.ok(review.includes("user_id = auth.uid()"));
  assert.ok(review.includes("This draft DOES NOT apply those two metadata changes"));
  assert.ok(review.includes("Keep the live gate closed"));
});
