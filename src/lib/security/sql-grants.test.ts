import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve("supabase/migrations/20261109010000_authenticated_read_reconciliation.sql"), "utf8");
const postflight = readFileSync(resolve("docs/security/STEP-7R8-POSTFLIGHT.sql"), "utf8");
const review = readFileSync(resolve("docs/security/STEP-7R8-REVIEW.md"), "utf8");
const sql = migration.replace(/--[^\r\n]*/g, "");

test("atomic correction adds only authenticated SELECT on the five exact tables", () => {
  const grants = [...sql.matchAll(/\bgrant\s+select\s+on\s+table\s+([\s\S]*?)\s+to\s+authenticated\s*;/gi)];
  assert.equal(grants.length, 1);
  assert.deepEqual(grants[0][1].split(",").map((name) => name.trim()).sort(), [
    "public.documents", "public.esg_extractions", "public.extracted_esg_fields",
    "public.organization_memberships", "public.organizations",
  ]);
  assert.equal((sql.match(/^\s*grant\s/gim) ?? []).length, 1);
  assert.doesNotMatch(sql, /grant\s+(?:insert|update|delete|all|usage|execute)|grant[^;]*\bto\s+(?:anon|public)\b/i);
  assert.doesNotMatch(grants[0][0], /storage\.|auth\.|default/i);
});

test("grants and all policy changes commit together, after baseline checks", () => {
  assert.equal((sql.match(/^begin;/gim) ?? []).length, 1);
  assert.equal((sql.match(/^commit;/gim) ?? []).length, 1);
  const grant = sql.indexOf("grant select on table");
  assert.ok(sql.indexOf("$grant_baseline$;") < grant);
  assert.ok(grant < sql.indexOf("Expected table-level SELECT grant absent"));
  assert.ok(sql.indexOf("$metadata_reconciliation$;") < sql.indexOf("$grant_postconditions$;"));
  assert.ok(sql.indexOf("$grant_postconditions$;") < sql.lastIndexOf("commit;"));
  assert.ok(sql.includes("public.organization_memberships, storage.objects in access exclusive mode"));
});

test("baseline and postconditions deny anon and effective column/table write privileges", () => {
  assert.ok(sql.includes("'authenticated'::regrole::oid, 'anon'::regrole::oid"));
  assert.ok(sql.includes("rolsuper or rolbypassrls"));
  assert.ok(sql.includes("'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'"));
  assert.ok(sql.includes("has_any_column_privilege(role_oid, relation_oid, 'INSERT,UPDATE,REFERENCES')"));
  assert.ok(sql.includes("has_any_column_privilege('anon', relation_oid, 'SELECT,INSERT,UPDATE,REFERENCES')"));
  assert.ok(sql.includes("has_table_privilege('authenticated', relation_oid, 'SELECT')"));
  assert.doesNotMatch(sql, /^\s*(insert|update|delete|truncate|create|drop|revoke)\b/im);
});

test("all six policy restrictions preserve old predicates and authenticated role applicability", () => {
  for (const name of ["documents_select_active_member", "esg_extractions_select_active_member", "extracted_esg_fields_select_active_member", "storage_documents_select_active_member", "organizations_select_active_member", "memberships_select_same_organization"]) {
    assert.ok(sql.includes(`'${name}'`));
  }
  assert.ok(sql.includes("format('(%s) AND (%s)', old_predicate, target.new_predicate)"));
  assert.ok(sql.includes("TO authenticated USING ((%s) AND (%s))"));
  assert.ok(sql.includes("Metadata role change could broaden policy coverage"));
  assert.ok(sql.includes("Additional permissive metadata SELECT/ALL policy needs review"));
  assert.ok(sql.includes("user_id = auth.uid() and status::text = 'active'"));
  assert.ok(sql.includes("role::text in ('owner', 'reviewer')"));
});

test("Storage retains guarded organization/document/path matching without new grants", () => {
  assert.ok(sql.includes("CASE WHEN bucket_id = %L AND name ~* %L THEN (%s) ELSE false END"));
  assert.ok(sql.includes("d.storage_path = storage.objects.name"));
  assert.ok(sql.includes("d.id = pg_catalog.split_part(pg_catalog.split_part(storage.objects.name, '/', 2), '.', 1)::uuid"));
  assert.ok(sql.includes("has_table_privilege('authenticated', relation_oid, 'SELECT')"));
  assert.doesNotMatch(sql, /grant[^;]*storage\./i);
  assert.doesNotMatch(sql, /\bcreated_by\b/);
});

for (const role of ["owner", "reviewer", "member", "unknown"]) {
  for (const status of ["active", "suspended"]) {
    test(`metadata model: ${status} ${role} sees only an authorized self membership`, () => {
      const allowedRole = role === "owner" || role === "reviewer";
      const selfMembership = (self: boolean, oldPredicate: boolean) => oldPredicate && self && status === "active" && allowedRole;
      assert.equal(selfMembership(true, true), status === "active" && allowedRole);
      assert.equal(selfMembership(false, true), false);
      assert.equal(selfMembership(true, false), false);
    });
  }
}

test("postflight stays read-only and checks effective privileges and six policies", () => {
  const source = postflight.replace(/--[^\r\n]*/g, "");
  assert.match(source, /begin transaction isolation level repeatable read read only/i);
  assert.match(source.trim(), /rollback;$/i);
  assert.doesNotMatch(source, /^\s*(alter|grant|revoke|create|drop|insert|update|delete|truncate)\b/im);
  assert.ok(source.includes("authenticated_select_only_anon_denied"));
  assert.ok(source.includes("unexpected_permissive_select_all"));
  assert.ok(source.includes("unchanged_grants"));
});

test("documentation forbids separate grant commits, older draft execution and read-gate enablement", () => {
  assert.ok(review.includes("NEVER commit grants first"));
  assert.ok(review.includes("Do NOT execute the previous unapplied"));
  assert.ok(review.includes("live read gate remains false"));
  assert.ok(review.includes("ONE transaction"));
  const gate = readFileSync(resolve("src/lib/security/database-verification.ts"), "utf8");
  assert.ok(gate.includes("DATABASE_READS_VERIFIED = false"));
});

test("reviewed catalog calls use known PostgreSQL function names", () => {
  // Name/signature contract only; this is not a PostgreSQL parse/execution test.
  const known = new Set([
    "has_schema_privilege", "pg_has_role", "has_table_privilege", "has_any_column_privilege",
    "to_regprocedure", "has_function_privilege", "current_setting", "substr", "strpos",
    "unnest", "split_part", "regexp_replace", "set_config", "cardinality", "current_schemas",
    "pg_get_expr", "format", "to_regclass", "pg_get_functiondef", "pg_get_userbyid", "format_type",
    "jsonb_to_recordset", "regexp_matches", "encode", "convert_to", "md5", "sha256", "to_regrole", "has_column_privilege",
  ]);
  for (const source of [sql, postflight.replace(/--[^\r\n]*/g, "")]) {
    for (const call of source.matchAll(/pg_catalog\.([a-z_]+)\s*\(/g)) {
      assert.ok(known.has(call[1]), `Unreviewed pg_catalog function: ${call[1]}`);
    }
  }
});

test("privilege probes use table and column privilege vocabularies correctly", () => {
  const tablePrivileges = new Set(["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER", "MAINTAIN"]);
  const columnPrivileges = new Set(["SELECT", "INSERT", "UPDATE", "REFERENCES"]);
  let checked = 0;
  for (const source of [sql, postflight]) {
    for (const match of source.matchAll(/(has_table_privilege|has_any_column_privilege)\(([^()]+)\)/g)) {
      const privileges = match[2].match(/'([A-Z, ]+)'\s*$/);
      assert.ok(privileges, "Privilege probe must end in an explicit reviewed privilege list");
      const allowed = match[1] === "has_table_privilege" ? tablePrivileges : columnPrivileges;
      for (const privilege of privileges[1].replace(/ WITH GRANT OPTION/g, "").split(",")) assert.ok(allowed.has(privilege));
      checked += 1;
    }
  }
  assert.ok(checked >= 10);
});

test("postgres helper ownership and nonrecursive definer read path are enforced", () => {
  assert.ok(sql.includes("proowner = 'postgres'::regrole::oid"));
  assert.ok(sql.includes("pg_has_role('authenticated'::regrole, 'postgres'::regrole, 'MEMBER')"));
  assert.ok(sql.includes("pg_has_role('anon'::regrole, 'postgres'::regrole, 'MEMBER')"));
  assert.ok(sql.includes("or (c.relowner = r.oid and not c.relforcerowsecurity)"));
  assert.ok(sql.includes("Reviewed helper owner cannot safely read memberships independently of recursive RLS"));
});

test("both deparsing blocks configure their own safe search_path", () => {
  const metadata = sql.slice(sql.indexOf("do $metadata_reconciliation$"));
  assert.ok(metadata.indexOf("set_config('search_path', 'pg_catalog', true)") < metadata.indexOf("pg_get_expr"));
  const protectedPolicies = sql.slice(sql.indexOf("do $restrict_policies$"));
  assert.ok(protectedPolicies.indexOf("set_config('search_path', 'pg_catalog', true)") < protectedPolicies.indexOf("pg_get_expr"));
  assert.doesNotMatch(sql, /ALTER POLICY[^'\r\n]*\bFOR SELECT\b/i);
});

test("postflight fails helper drift instead of merely reporting it for review", () => {
  assert.ok(postflight.includes("pg_catalog.pg_get_userbyid(p.proowner)::text is distinct from h.owner"));
  assert.ok(postflight.includes("has_function_privilege(pg_catalog.to_regrole('authenticated')::oid, p.oid, 'EXECUTE') is distinct from true"));
  assert.ok(postflight.includes("h.prosecdef is distinct from h.expected_definer"));
  assert.ok(postflight.includes("h.provolatile::text is distinct from h.expected_volatility"));
  assert.ok(postflight.includes("membership_read_without_recursive_rls"));
  assert.ok(postflight.includes("roles_equal and command_equal and mode_equal"));
});

test("MVP peer membership remains unavailable and locking effects are explicit", () => {
  assert.ok(review.includes("owners cannot list other organization members"));
  assert.ok(review.includes("not total transaction duration"));
  assert.ok(review.includes("not the entire script"));
  assert.ok(review.includes("owner/reviewer reads relative to the old no-grants state"));
});
