import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const sql = read('./POSTFLIGHT-PREDICATE-DIAGNOSTIC.sql');
const canonical = read('./STEP-7R8-POSTFLIGHT.sql');

test('local predicate reconstructions match the reviewed hashes without approval', () => {
  const reference = JSON.parse(read('./POSTFLIGHT-HASH-MATCHED-CANDIDATES.json'));
  assert.equal(reference.baseline_approved, false);
  assert.equal(reference.comparator_change_approved, false);
  for (const c of reference.candidates) {
    assert.equal(c.full_live_text_verified, false);
    assert.equal(createHash('md5').update(c.locally_reconstructed_using).digest('hex'), c.reported_actual_md5);
  }
});

test('grouping-only candidate explanation preserves SQL three-valued conjunction results', () => {
  const and = (...values) => values.includes(false) ? false : values.includes(null) ? null : true;
  const or = (...values) => values.includes(true) ? true : values.includes(null) ? null : false;
  for (const a of [true, false, null]) for (const b of [true, false, null])
    for (const c of [true, false, null]) for (const d of [true, false, null]) {
      assert.equal(and(a, b, c, d), and(a, b, and(c, d)));
      assert.equal(and(or(a, b), a, c, d), and(or(a, b), and(a, c, d)));
    }
  // Boolean result equivalence is not an evaluation-order/cast-safety proof.
});

test('diagnostic reuses canonical expected expressions and comparator without relaxing grouping', () => {
  const block = source => source.slice(source.indexOf('with\nbaseline as ('), source.indexOf('configuration as ('));
  assert.ok(sql.includes(block(canonical)));
  assert.deepEqual(JSON.parse(sql.split('$snapshots$')[1]), JSON.parse(canonical.split('$snapshots$')[1]));
  assert.match(sql, /using_tokens_equal and t\.check_tokens_equal/);
  assert.match(sql, /t\.roles_equal and t\.command_equal and t\.mode_equal then 'PASS' else 'FAIL'/);
  for (const name of ['documents_select_active_member', 'memberships_select_same_organization', 'storage_documents_select_active_member']) assert.ok(sql.includes(name));
});

test('diagnostic exports full expressions, types and metadata but performs no data/helper operations', () => {
  const code = sql.replace(/\$([a-z_]+)\$[\s\S]*?\$\1\$/g, "''").replace(/'(?:[^']|'')*'/g, "''").replace(/--[^\r\n]*/g, '');
  assert.match(code, /repeatable read read only/);
  assert.match(code.trim(), /rollback;$/);
  assert.doesNotMatch(code, /^\s*(alter|grant|revoke|create|drop|insert|update|delete|truncate|do|execute|lock|load)\b/im);
  assert.doesNotMatch(code, /\b(?:from|join)\s+(?:public\.|storage\.objects|auth\.users)/i);
  assert.doesNotMatch(code, /public\.(?:is_active_organization_member|has_active_organization_role|document_storage_organization_id)\s*\(/);
  for (const key of ['expected_using', 'actual_using', 'actual_utf8_hex', 'expected_with_check', 'actual_roles', 'actual_command', 'actual_permissive', 'first_24_positional_differences']) assert.ok(sql.includes(`'${key}'`));
  assert.match(sql, /p\.polcmd in \('r', '\*'\)/);
  assert.match(sql, /case when p\.polname = t\.policy_name then 'REVIEW' else 'FAIL'/);
});

test('migration and proposed baseline/limitations remain unchanged and disabled', () => {
  const bytes = readFileSync(new URL('../../supabase/migrations/20261109010000_authenticated_read_reconciliation.sql', import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex').toUpperCase(), 'B435B165A360C8CAED32B74794A6FBCA3BBAE29C1702F0B183462DDCF31A4087');
  assert.match(canonical, /select false::boolean as baseline_approved/);
  assert.match(canonical, /'full_graph_not_baselined', 'REVIEW'/);
  assert.match(canonical, /'maintain_not_baselined'/);
  assert.match(read('../../src/lib/security/database-verification.ts'), /DATABASE_READS_VERIFIED = false/);
});
