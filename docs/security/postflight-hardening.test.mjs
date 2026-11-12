import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const post = read('./STEP-7R8-POSTFLIGHT.sql');
const exporter = read('./STORAGE-PRE-MIGRATION-PRIVILEGES-EXPORT.sql');
const expected = JSON.parse(read('./POSTFLIGHT-EXPECTED-POLICIES.json'));
const original = JSON.parse(read('./STEP-7R13-CURRENT-STATE-REFERENCE.json'));
const tokens = s => s.match(/'(?:[^']|'')*'|"(?:[^"]|"")*"|::|[A-Za-z_][A-Za-z_0-9$]*|[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?|[-+*/<>=~!@#%^&|`?]+|[^\s]/g);

test('canonical postflight matches the proposed Storage snapshot without approval', () => {
  const m = JSON.parse(read('./PROPOSED-STORAGE-CURRENT-STATE/PROPOSED-CURRENT-STORAGE-SNAPSHOT.json'));
  assert.match(m.source_sha256, /^[a-f0-9]{64}$/);
  assert.equal(m.baseline_approved, false);
  assert.equal(m.migration_execution_approved, false);
  assert.deepEqual(JSON.parse(post.split('$proposed_storage$')[1]), m.snapshot);
  assert.match(post, /select false::boolean as baseline_approved/);
  assert.match(post, /when s\.snapshot is distinct from b\.proposed_snapshot then 'FAIL'/);
  assert.match(post, /when b\.baseline_approved is distinct from true then 'REVIEW' else 'PASS'/);
  const pointer = read('./PROPOSED-STORAGE-CURRENT-STATE/POSTFLIGHT.sql');
  assert.doesNotMatch(pointer.replace(/--[^\r\n]*/g, ''), /\S/);
});

test('six independent post-predicates preserve original source and narrow roles', () => {
  assert.deepEqual(JSON.parse(post.split('$snapshots$')[1]), expected.policies);
  assert.equal(expected.policies.length, 6);
  for (const p of expected.policies) {
    assert.equal(p.original_using_sql, original.policies.find(o => o.relation_name === p.relation_name).using_sql);
    assert.match(p.restriction_deparsed, /'owner'::text, 'reviewer'::text/);
    assert.notDeepEqual(tokens(p.using_sql), tokens(p.original_using_sql));
    assert.notDeepEqual(tokens(p.using_sql), tokens(p.using_sql.replace("'reviewer'::text", "'member'::text")));
    assert.deepEqual(tokens(p.using_sql), tokens(p.using_sql.replace(/ AND /g, '\nAND\n')));
  }
  const storage = expected.policies.find(p => p.relation_name === 'storage.objects').using_sql;
  assert.match(storage, /^CASE WHEN.*THEN.*ELSE false END$/);
  for (const fragment of ['d.storage_path = objects.name', 'd.organization_id IS NOT NULL', 'd.organization_id =', 'd.id =', '[.]pdf$']) assert.ok(storage.includes(fragment));
  assert.notDeepEqual(tokens(storage), tokens(storage.replace('ELSE false', 'ELSE true')));
});

test('postflight and export are catalog-only read-only transactions', () => {
  for (const sql of [post, exporter]) {
    const code = sql.replace(/\$([a-z_]+)\$[\s\S]*?\$\1\$/g, "''").replace(/'(?:[^']|'')*'/g, "''").replace(/--[^\r\n]*/g, '');
    assert.match(code, /begin transaction isolation level repeatable read read only/);
    assert.match(code.trim(), /rollback;$/);
    assert.doesNotMatch(code, /^\s*(create|alter|grant|revoke|drop|insert|update|delete|do|execute|lock|load)\b/im);
    assert.doesNotMatch(code, /\b(?:from|join)\s+(?:public\.|storage\.objects|auth\.users)/i);
    assert.doesNotMatch(code, /public\.(?:is_active_organization_member|has_active_organization_role|document_storage_organization_id)\s*\(/);
  }
});

test('exact R17 helper reference reused; unknown Storage baseline never passes', () => {
  const refs = JSON.parse(post.split('$verified_helpers$')[1]);
  assert.deepEqual(refs, JSON.parse(read('./FINAL-PRE-EXECUTION-DRIFT.sql').split('$verified_helpers$')[1]));
  assert.match(post, /when b\.proposed_snapshot is null then 'REVIEW'/);
  assert.match(post, /when s\.snapshot is distinct from b\.proposed_snapshot then 'FAIL'/);
  assert.match(post, /when b\.baseline_approved is distinct from true then 'REVIEW' else 'PASS'/);
  assert.match(post, /'maintain_not_baselined'/);
  assert.match(post, /when c\.version_num >= 170000 then 'REVIEW' else 'PASS'/);
  assert.match(post, /'full_graph_not_baselined', 'REVIEW'/);
  assert.ok(post.indexOf("when s.snapshot is distinct from b.proposed_snapshot then 'FAIL'")
    < post.indexOf("when b.baseline_approved is distinct from true then 'REVIEW'"));
  assert.match(post, /'no_public_maintain_privilege'/);
  const snapshot = sql => sql.slice(sql.indexOf('storage_snapshot as ('), sql.indexOf('\n)', sql.indexOf('storage_snapshot as (')) + 2);
  assert.equal(snapshot(post), snapshot(exporter));
  assert.match(post, /'SELECT WITH GRANT OPTION'/);
  assert.match(post, /'column_effective'/);
  assert.match(post, /'grantable_references'/);
});

test('review tool fails closed and can prepare only explicitly reviewed synthetic snapshot', () => {
  const temp = mkdtempSync(join(tmpdir(), 'envario-storage-postflight-'));
  try {
    const script = fileURLToPath(new URL('./prepare-storage-postflight.mjs', import.meta.url));
    const input = join(temp, 'synthetic.json');
    const output = join(temp, 'reviewed');
    const keys = ['table_select', 'table_insert', 'table_update', 'table_delete', 'table_truncate', 'table_references', 'table_trigger', 'column_select', 'column_insert', 'column_update', 'column_references'];
    const effective = Object.fromEntries(['anon', 'authenticated'].map(role => [role, { role_exists: true, ...Object.fromEntries(keys.map(k => [k, k.includes('select')])), grantable_table: Array(7).fill(false) }]));
    const snapshot = { owner: 'supabase_storage_admin', acl_is_null: false, acl: [], column_acls: [], effective,
      column_effective: ['anon', 'authenticated'].map(role => ({ column: 'synthetic', role, select: true, insert: false, update: false, references: false, grantable_select: false, grantable_insert: false, grantable_update: false, grantable_references: false })) };
    writeFileSync(input, JSON.stringify([{ result: 'REVIEW', operator_must_confirm_project_ref: 'gkhrtrakukqdhgvucudv', snapshot }]));
    const run = args => spawnSync(process.execPath, [script, input, ...args], { encoding: 'utf8' });
    assert.equal(run([]).status, 0);
    assert.equal(existsSync(output), false);
    const proposed = join(temp, 'proposed');
    assert.equal(run(['--propose-current-state', proposed]).status, 0);
    const manifest = JSON.parse(readFileSync(join(proposed, 'PROPOSED-CURRENT-STORAGE-SNAPSHOT.json'), 'utf8'));
    assert.equal(manifest.baseline_approved, false);
    assert.equal(manifest.operator_asserts_human_review_before_migration, false);
    assert.equal(manifest.migration_execution_approved, false);
    assert.deepEqual(readFileSync(join(proposed, 'source-export.raw')), readFileSync(input));
    assert.deepEqual(manifest.snapshot, snapshot);
    assert.equal(existsSync(join(proposed, 'POSTFLIGHT.sql')), false);
    assert.match(readFileSync(join(proposed, 'POSTFLIGHT-LOCATION.txt'), 'utf8'), /STEP-7R8-POSTFLIGHT.sql/);
    assert.equal(run(['--human-reviewed-before-migration', output]).status, 0);
    assert.equal(existsSync(join(output, 'POSTFLIGHT.sql')), false);
    assert.match(readFileSync(join(output, 'POSTFLIGHT-LOCATION.txt'), 'utf8'), /STEP-7R8-POSTFLIGHT.sql/);
    assert.equal(run(['--human-reviewed-before-migration', output]).status, 1);
    snapshot.acl = ['invalid ACL'];
    writeFileSync(input, JSON.stringify([{ result: 'REVIEW', operator_must_confirm_project_ref: 'gkhrtrakukqdhgvucudv', snapshot }]));
    assert.equal(run([]).status, 1);
    snapshot.acl = [];
    snapshot.column_effective[0].insert = true;
    writeFileSync(input, JSON.stringify([{ result: 'REVIEW', operator_must_confirm_project_ref: 'gkhrtrakukqdhgvucudv', snapshot }]));
    assert.equal(run([]).status, 1);
    snapshot.column_effective[0].insert = false;
    snapshot.effective.anon.table_select = null;
    writeFileSync(input, JSON.stringify([{ result: 'REVIEW', operator_must_confirm_project_ref: 'gkhrtrakukqdhgvucudv', snapshot }]));
    assert.equal(run([]).status, 1);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
