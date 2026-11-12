import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const sql = read('./FINAL-PRE-EXECUTION-DRIFT.sql');
const prior = read('./STEP-7R13-BASELINE-DRIFT-PREFLIGHT.sql');
const manifest = JSON.parse(read('./STEP-7R17-VERIFIED-CURRENT-STATE/CURRENT-STATE-BASELINE.json'));
const embedded = JSON.parse(sql.split('$verified_helpers$')[1]);
const policies = JSON.parse(sql.split('$snapshots$')[1]);

test('policy snapshots are reused unchanged, not learned from live values', () => {
  assert.deepEqual(policies, JSON.parse(read('./STEP-7R13-CURRENT-STATE-REFERENCE.json')).policies);
  assert.deepEqual(policies, JSON.parse(prior.split('$snapshots$')[1]));
  for (const marker of ['using_tokens_equal', 'check_tokens_equal', 'roles_equal', 'command_equal', 'mode_equal'])
    assert.ok(sql.includes(marker));
});

test('embedded helper bytes, fingerprints and metadata match verified artifact', () => {
  assert.equal(embedded.length, 3);
  for (const h of embedded) {
    const saved = manifest.helpers.find(r => r.signature === h.signature);
    const bytes = readFileSync(new URL('./STEP-7R17-VERIFIED-CURRENT-STATE/' + saved.filename, import.meta.url));
    assert.equal(h.definition_hex, bytes.toString('hex'));
    assert.equal(h.md5, createHash('md5').update(bytes).digest('hex'));
    assert.equal(h.sha256, createHash('sha256').update(bytes).digest('hex'));
    assert.equal(h.md5, saved.md5);
    assert.deepEqual(h.configuration, JSON.parse(saved.metadata.configuration));
    assert.deepEqual(h.acl, JSON.parse(saved.metadata.acl));
    assert.equal(h.security_definer, saved.metadata.security_definer === 'true');
  }
  assert.doesNotMatch(sql, /'uuid', null::text|'boolean', null::text/);
  assert.doesNotMatch(sql, /No exact reviewed helper body fingerprint was supplied/);
});

test('single read-only transaction, single final result, no helper or data calls', () => {
  const code = sql.replace(/\$([a-z_]+)\$[\s\S]*?\$\1\$/g, "''")
    .replace(/'(?:[^']|'')*'/g, "''").replace(/--[^\r\n]*/g, '');
  assert.equal((code.match(/begin transaction/g) ?? []).length, 1);
  assert.match(code, /repeatable read read only/);
  assert.match(code.trim(), /rollback;$/);
  assert.equal((code.match(/select category, object_name, check_name, result, details/g) ?? []).length, 1);
  assert.doesNotMatch(code, /^\s*(create|alter|drop|grant|revoke|insert|update|delete|truncate|do|execute|lock|load)\b/im);
  assert.doesNotMatch(code, /\b(?:from|join)\s+(?:public\.|auth\.users|storage\.objects)/i);
  assert.doesNotMatch(code, /public\.(?:is_active_organization_member|has_active_organization_role|document_storage_organization_id)\s*\(/);
});

test('R13 infrastructure coverage and final no-approval checkpoint retained', () => {
  const checks = [...prior.matchAll(/'([a-z_]+)'\s*,\s*\r?\n\s*case when/g)].map(m => m[1]);
  for (const check of checks) assert.ok(sql.includes(`'${check}'`), check);
  for (const marker of ['existing_supautils_policy_authority', 'existing_access_exclusive_lock_rights',
    'unapplied_no_application_grants_baseline', 'nonrecursive_membership_lookup', 'private_pdf_only_5mb',
    'no_extra_permissive_select_all', 'exact_bytes_metadata_acl_execute', 'manual_checkpoint'])
    assert.ok(sql.includes(`'${marker}'`), marker);
  assert.match(sql, /'manual_checkpoint', 'REVIEW'/);
  assert.match(sql, /pg_catalog\.sha256\(pg_catalog\.convert_to/);
  assert.match(sql, /p\.proconfig is distinct from h\.configuration/);
  assert.match(sql, /to_regrole\('anon'\).*EXECUTE'\) is distinct from false/);
});
