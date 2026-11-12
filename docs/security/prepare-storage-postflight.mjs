// Offline only. Proposed preservation never approves a baseline or execution.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { parseCsv } from './verify-helper-hex.mjs';

try {
  const args = process.argv.slice(2);
  const proposed = args[1] === '--propose-current-state';
  if (args.length !== 1 && !(args.length === 3 && ['--human-reviewed-before-migration', '--propose-current-state'].includes(args[1])))
    throw new Error('Usage: node prepare-storage-postflight.mjs export.csv|export.json [--propose-current-state NEW_DIRECTORY | --human-reviewed-before-migration NEW_DIRECTORY]');
  const raw = readFileSync(resolve(args[0]));
  const text = raw.toString('utf8').replace(/^\uFEFF/, '');
  const rows = args[0].toLowerCase().endsWith('.json') ? JSON.parse(text) : parseCsv(text);
  if (!Array.isArray(rows) || rows.length !== 1 || rows[0].result !== 'REVIEW'
    || rows[0].operator_must_confirm_project_ref !== 'gkhrtrakukqdhgvucudv') throw new Error('Expected one complete reviewable isolated-target export');
  const snapshot = typeof rows[0].snapshot === 'string' ? JSON.parse(rows[0].snapshot) : rows[0].snapshot;
  if (snapshot?.owner !== 'supabase_storage_admin' || typeof snapshot.acl_is_null !== 'boolean' || !Array.isArray(snapshot.acl)
    || !Array.isArray(snapshot.column_acls) || !Array.isArray(snapshot.column_effective)
    || snapshot.effective?.anon?.role_exists !== true || snapshot.effective?.authenticated?.role_exists !== true
    || snapshot.effective?.authenticated?.table_select !== true) throw new Error('Incomplete/unexpected Storage snapshot');
  const tableKeys = ['table_select', 'table_insert', 'table_update', 'table_delete', 'table_truncate', 'table_references', 'table_trigger', 'column_select', 'column_insert', 'column_update', 'column_references'];
  for (const role of ['anon', 'authenticated']) {
    const r = snapshot.effective[role];
    if (tableKeys.some(k => typeof r[k] !== 'boolean') || !Array.isArray(r.grantable_table)
      || r.grantable_table.length !== 7 || r.grantable_table.some(v => typeof v !== 'boolean')) throw new Error('Incomplete effective rights');
  }
  if (!snapshot.column_effective.length || snapshot.column_effective.some(c => typeof c.column !== 'string'
    || !['anon', 'authenticated'].includes(c.role)
    || ['select', 'insert', 'update', 'references', 'grantable_select', 'grantable_insert', 'grantable_update', 'grantable_references'].some(k => typeof c[k] !== 'boolean')))
    throw new Error('Incomplete effective column rights');
  const grouped = new Map();
  for (const c of snapshot.column_effective) {
    const key = JSON.stringify([c.column, c.role]);
    if (grouped.has(key)) throw new Error('Duplicate column/role');
    grouped.set(key, c);
  }
  for (const c of snapshot.column_effective) for (const r of ['anon', 'authenticated'])
    if (!grouped.has(JSON.stringify([c.column, r]))) throw new Error('Missing column/role');
  const aclEntry = /^(?:"(?:[^"]|"")*"|[^"=\s]*)=[arwdDxtm*]*\/(?:"(?:[^"]|"")*"|[^"/\s]+)$/;
  const validateAcl = acl => Array.isArray(acl) && new Set(acl).size === acl.length
    && acl.every(a => typeof a === 'string' && aclEntry.test(a));
  if (!validateAcl(snapshot.acl) || (snapshot.acl_is_null && snapshot.acl.length)) throw new Error('Malformed table ACL');
  const aclColumns = new Set();
  for (const a of snapshot.column_acls) {
    if (typeof a.column !== 'string' || !a.column || aclColumns.has(a.column) || !validateAcl(a.acl)
      || !grouped.has(JSON.stringify([a.column, 'anon']))) throw new Error('Malformed/unmatched column ACL');
    aclColumns.add(a.column);
  }
  for (const role of ['anon', 'authenticated']) {
    const columns = snapshot.column_effective.filter(c => c.role === role);
    const r = snapshot.effective[role];
    for (const privilege of ['select', 'insert', 'update', 'references']) {
      if (r['column_' + privilege] !== columns.some(c => c[privilege])) throw new Error('Column privilege aggregate mismatch');
      if (r['table_' + privilege] && columns.some(c => !c[privilege])) throw new Error('Table/column privilege mismatch');
    }
  }
  console.log(JSON.stringify(snapshot, null, 2));
  if (args.length === 1) console.log('REVIEW ONLY: no files written. Independently verify target, pre-migration timing and every privilege.');
  else {
    const output = resolve(args[2]); mkdirSync(output);
    writeFileSync(join(output, 'source-export.raw'), raw, { flag: 'wx' });
    writeFileSync(join(output, proposed ? 'PROPOSED-CURRENT-STORAGE-SNAPSHOT.json' : 'APPROVED-CURRENT-STORAGE-SNAPSHOT.json'), JSON.stringify({
      baseline_approved: !proposed, proposed_current_state_only: proposed,
      operator_asserts_human_review_before_migration: !proposed, project_identity_verified_by_script: false,
      migration_execution_approved: false, source_sha256: createHash('sha256').update(raw).digest('hex'), snapshot,
    }, null, 2) + '\n', { flag: 'wx' });
    writeFileSync(join(output, 'POSTFLIGHT-LOCATION.txt'),
      'Canonical postflight: docs/security/STEP-7R8-POSTFLIGHT.sql\nThis export does not modify its embedded baseline or approval flag.\n', { flag: 'wx' });
    console.log(proposed ? 'Preserved proposed snapshot. Canonical postflight unchanged; no baseline or migration approval.'
      : 'Saved explicitly reviewed snapshot evidence only. Canonical postflight/approval flag unchanged; no migration permission.');
  }
} catch (error) { console.error(`FAIL: ${error.message}`); process.exitCode = 1; }
