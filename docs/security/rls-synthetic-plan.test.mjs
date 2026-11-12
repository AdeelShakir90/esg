import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const role = read('./RLS-SYNTHETIC-ROLE-READS.sql');
const fixtures = read('./RLS-SYNTHETIC-FIXTURES-REVIEW.sql');
const cleanup = read('./RLS-SYNTHETIC-CLEANUP-REVIEW.sql');
const schema = read('./RLS-SYNTHETIC-SCHEMA-PREFLIGHT.sql');
const code = s => s.replace(/'(?:[^']|'')*'/g, "''").replace(/--[^\r\n]*/g, '');

test('every SQL artifact is review-only, rollback-ending and changes no policy/grant/user/schema', () => {
  for (const sql of [role, fixtures, cleanup, schema]) {
    assert.match(sql, /REVIEW ONLY/);
    assert.match(code(sql).trim(), /rollback;$/i);
    assert.doesNotMatch(code(sql), /^\s*(create|alter|grant|revoke|drop|truncate|commit)\b/im);
    assert.doesNotMatch(code(sql), /(?:insert into|delete from|update)\s+(?:storage\.|auth\.|public\.(?:organization_memberships|organizations))/i);
  }
});

test('read simulations verify fixtures and all seven contexts without table writes', () => {
  assert.match(role, /begin transaction isolation level repeatable read read only/);
  assert.doesNotMatch(code(role), /\b(insert into|delete from|update\s+public\.)\b/i);
  assert.equal((role.match(/^set local role /gm) ?? []).length, 7);
  assert.equal((role.match(/^reset role;/gm) ?? []).length, 7);
  for (const name of ['anonymous', 'owner_a', 'reviewer_a', 'owner_b', 'active_member', 'suspended_member', 'outsider']) assert.ok(role.includes(`-- Persona ${name};`));
  assert.ok(role.indexOf('positive/unowned fixtures missing') < role.indexOf('set local role anon;'));
  assert.match(role, /operator_confirmed_synthetic_target boolean := false/);
  assert.match(role, /owner_a uuid := null/);
  assert.match(role, /auth\.uid\(\) is not distinct from nullif/);
  assert.match(role, /not r\.rolsuper and not r\.rolbypassrls/);
  for (const label of ['exact_document_set', 'parent_extraction_set', 'parent_field_set', 'organization_metadata', 'self_only_membership', 'direct_storage_rows']) assert.ok(role.includes(label));
});

test('fixture setup fails on collision and cleanup checks exact parents before scoped deletion', () => {
  assert.match(fixtures, /reserved fixture ID collision/);
  assert.match(fixtures, /synthetic_pdf_bytes integer := null/);
  assert.doesNotMatch(fixtures, /on conflict/i);
  assert.match(fixtures, /'synthetic-no-api', 'synthetic-no-model'/);
  assert.match(cleanup, /operator_confirmed_target_and_storage_cleanup boolean := false/);
  assert.match(cleanup, /remove owned manifest objects via Storage API first/);
  assert.match(cleanup, /\(extractions\[1\], documents\[1\]\)/);
  assert.match(cleanup, /\(fields\[1\], extractions\[1\]\)/);
  assert.match(cleanup, /delete from public\.documents where id = any\(documents\)/);
  assert.ok(cleanup.indexOf('delete from public.extracted_esg_fields') < cleanup.indexOf('delete from public.esg_extractions'));
});

test('accepted semantic finding does not approve baseline, alter migration or open gate', () => {
  const plan = read('./RLS-SYNTHETIC-TEST-PLAN.md');
  assert.match(plan, /user accepts the separate semantic-equivalence finding/);
  for (const term of ['MAINTAIN', 'full role graph', 'proposed Storage', 'real user-scoped sessions', 'upsert=false', 'never an isolation test']) assert.ok(plan.toLowerCase().includes(term.toLowerCase()), term);
  assert.match(schema, /pg_catalog\.pg_trigger/);
  assert.match(schema, /inbound_foreign_key/);
  assert.match(read('./STEP-7R8-POSTFLIGHT.sql'), /select false::boolean as baseline_approved/);
  assert.match(read('../../src/lib/security/database-verification.ts'), /DATABASE_READS_VERIFIED = false/);
  const bytes = readFileSync(new URL('../../supabase/migrations/20261109010000_authenticated_read_reconciliation.sql', import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex').toUpperCase(), 'B435B165A360C8CAED32B74794A6FBCA3BBAE29C1702F0B183462DDCF31A4087');
});
