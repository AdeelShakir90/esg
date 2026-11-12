import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseCsv, verifyRows } from './verify-helper-hex.mjs';

const definitions = ['select 1;\r\n', 'select 2;\n\n', '-- UTF-8: é\nselect 3;'];
const rows = definitions.map((text, i) => ({
  signature: `public.synthetic_${i}()`, owner: 'postgres', security_definer: false,
  volatility: 'i', search_path_settings: '["\\\"\\\""]', acl: '["authenticated=X/postgres"]',
  definition_hex: Buffer.from(text).toString('hex'),
  definition_md5: createHash('md5').update(text).digest('hex'),
}));
const reference = { helpers: rows.map(r => ({ ...r, reported_definition_md5: r.definition_md5, acl: JSON.parse(r.acl) })) };

test('preserves UTF-8, CRLF and trailing newlines byte-for-byte', () => {
  verifyRows(rows, reference).forEach((v, i) => assert.deepEqual(v.bytes, Buffer.from(definitions[i])));
});
test('CSV handles JSON arrays, commas, doubled quotes and CRLF', () => {
  const keys = Object.keys(rows[0]);
  const quote = v => '"' + String(v).replaceAll('"', '""') + '"';
  const csv = [keys, ...rows.map(r => keys.map(k => r[k]))].map(r => r.map(quote).join(',')).join('\r\n') + '\r\n';
  assert.equal(verifyRows(parseCsv(csv), reference).length, 3);
  assert.throws(() => parseCsv('a,b\n"unterminated'));
  assert.throws(() => parseCsv('a,b\n"closed"x,y'));
});
for (const [label, patch] of [
  ['odd hex', { definition_hex: 'abc' }],
  ['whitespace hex', { definition_hex: rows[0].definition_hex + ' ' }],
  ['invalid UTF-8', { definition_hex: 'ff' }],
  ['hash drift', { definition_md5: '0'.repeat(32) }],
  ['owner drift', { owner: 'other' }],
  ['search path drift', { search_path_settings: '["public"]' }],
  ['ACL drift', { acl: '["=X/postgres"]' }],
  ['definer drift', { security_definer: true }],
]) test(`rejects ${label}`, () => assert.throws(() => verifyRows([{ ...rows[0], ...patch }, ...rows.slice(1)], reference)));
test('rejects missing, duplicate and changed historical-observation fingerprints', () => {
  assert.throws(() => verifyRows(rows.slice(1), reference));
  assert.throws(() => verifyRows([rows[0], rows[0], rows[2]], reference));
  const changed = structuredClone(reference);
  changed.helpers[0].reported_definition_md5 = '0'.repeat(32);
  assert.throws(() => verifyRows(rows, changed));
});
test('export is a single catalog SELECT without helper calls or mutations', () => {
  const sql = readFileSync(new URL('./STEP-7R16-HELPER-HEX-EXPORT.sql', import.meta.url), 'utf8');
  const code = sql.replace(/--[^\r\n]*/g, '').replace(/'(?:[^']|'')*'/g, "''");
  assert.equal((code.match(/;/g) ?? []).length, 1);
  assert.doesNotMatch(code, /\b(create|alter|grant|revoke|insert|update|delete|execute|do|lock)\b/i);
  assert.doesNotMatch(code, /public\.[a-z_]+\s*\(/i);
  assert.match(code, /pg_catalog\.convert_to\(pg_catalog\.pg_get_functiondef/);
});
