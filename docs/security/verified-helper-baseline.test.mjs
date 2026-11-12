import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { verifyRows } from './verify-helper-hex.mjs';

const read = p => readFileSync(new URL(p, import.meta.url));
const manifest = JSON.parse(read('./STEP-7R17-VERIFIED-CURRENT-STATE/CURRENT-STATE-BASELINE.json'));
const reference = JSON.parse(read('./STEP-7R15-HELPER-CURRENT-STATE-REFERENCE.json'));
const md = (algorithm, bytes) => createHash(algorithm).update(bytes).digest('hex');

test('preserved definitions match the reviewed hex reference and MD5/SHA256 values', () => {
  const verified = verifyRows(manifest.helpers.map(helper => helper.metadata), reference);
  assert.deepEqual(verified.map(h => h.bytes.length), [403, 505, 436]);
  for (const h of verified) {
    const saved = manifest.helpers.find(x => x.signature === h.signature);
    const bytes = read(`./STEP-7R17-VERIFIED-CURRENT-STATE/${saved.filename}`);
    assert.deepEqual(bytes, h.bytes);
    assert.equal(md('md5', bytes), saved.md5);
    assert.equal(md('sha256', bytes), saved.sha256);
  }
});

test('mixed line ending diagnostic explains transcription without modifying bytes', () => {
  for (const h of manifest.helpers) {
    const text = read(`./STEP-7R17-VERIFIED-CURRENT-STATE/${h.filename}`).toString('utf8');
    assert.match(text, /\r\n/);
    assert.match(text, /[^\r]\n/);
    assert.equal(text.replace(/\r\n/g, '\n').replace(/\n$/, ''), reference.helpers.find(r => r.signature === h.signature).definition_text);
  }
});

test('baseline conveys no historical, project-attestation or migration approval', () => {
  assert.equal(manifest.bytes_verified, true);
  assert.equal(manifest.historical_equivalence_verified, false);
  assert.equal(manifest.migration_execution_approved, false);
  assert.equal(manifest.project_identity_verified_by_script, false);
  const policies = JSON.parse(read('./STEP-7R13-CURRENT-STATE-REFERENCE.json'));
  assert.equal(policies.execution_approved, false);
  assert.equal(policies.policies.length, 6);
  for (const p of policies.policies) {
    assert.deepEqual(p.roles, ['authenticated']);
    assert.equal(p.command, 'r');
    assert.equal(p.permissive, true);
    assert.equal(p.with_check_sql, null);
  }
});

test('migration remains exact and application read gate remains disabled', () => {
  assert.equal(md('sha256', read('../../supabase/migrations/20261109010000_authenticated_read_reconciliation.sql')).toUpperCase(),
    'B435B165A360C8CAED32B74794A6FBCA3BBAE29C1702F0B183462DDCF31A4087');
  assert.match(read('../../src/lib/security/database-verification.ts').toString(), /DATABASE_READS_VERIFIED = false/);
});
