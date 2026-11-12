// Local files only. No environment loading, database clients, or network imports.
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const referencePath = new URL('./STEP-7R15-HELPER-CURRENT-STATE-REFERENCE.json', import.meta.url);
const digest = (algorithm, bytes) => createHash(algorithm).update(bytes).digest('hex');

// RFC 4180-style CSV: quoted commas, embedded newlines, and doubled quotes.
export function parseCsv(text) {
  const rows = []; let row = [], cell = '', quoted = false, closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else cell += c;
    } else if (c === '"' && !cell && !closed) quoted = true;
    else if (c === ',' || c === '\n' || c === '\r') {
      row.push(cell); cell = ''; closed = false;
      if (c !== ',') { rows.push(row); row = []; if (c === '\r' && text[i + 1] === '\n') i++; }
    } else {
      if (closed || c === '"') throw new Error('Invalid CSV quoting');
      cell += c;
    }
  }
  if (quoted) throw new Error('Unterminated CSV cell');
  if (cell || row.length || closed) { row.push(cell); rows.push(row); }
  const headers = rows.shift();
  if (!headers || new Set(headers).size !== headers.length) throw new Error('Missing/duplicate CSV headers');
  return rows.map(values => {
    if (values.length !== headers.length) throw new Error('CSV column count mismatch');
    return Object.fromEntries(headers.map((key, i) => [key, values[i]]));
  });
}

export function verifyRows(rows, reference) {
  if (!Array.isArray(rows) || rows.length !== 3) throw new Error('Exactly three helper rows required');
  const seen = new Set();
  return rows.map(row => {
    const expected = reference.helpers.find(h => h.signature === row.signature);
    if (!expected || seen.has(row.signature)) throw new Error('Unexpected/duplicate helper signature');
    seen.add(row.signature);
    if (typeof row.definition_hex !== 'string' || !/^(?:[0-9a-fA-F]{2})+$/.test(row.definition_hex))
      throw new Error('Missing, malformed, truncated or whitespace-containing hex');
    const bytes = Buffer.from(row.definition_hex, 'hex');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    // Preserve BOMs and all original bytes; decoding must round-trip exactly.
    if (!Buffer.from(text, 'utf8').equals(bytes)) throw new Error('UTF-8 did not round-trip exactly');
    const md5 = digest('md5', bytes);
    if (typeof row.definition_md5 !== 'string' || !/^[0-9a-f]{32}$/.test(row.definition_md5) || md5 !== row.definition_md5)
      throw new Error(`Export MD5 mismatch: ${row.signature}`);
    if (md5 !== expected.reported_definition_md5) throw new Error(`Earlier observed MD5 mismatch: ${row.signature}`);
    const parseJsonCell = value => typeof value === 'string' ? JSON.parse(value) : value;
    const paths = parseJsonCell(row.search_path_settings);
    const acl = parseJsonCell(row.acl);
    const definer = row.security_definer === true || row.security_definer === 'true' || row.security_definer === 't';
    if (![true, false, 'true', 'false', 't', 'f'].includes(row.security_definer)) throw new Error('Invalid definer metadata');
    if (row.owner !== expected.owner || row.volatility !== expected.volatility || definer !== expected.security_definer
      || !Array.isArray(paths) || paths.length !== 1 || !['', '""'].includes(paths[0])
      || !Array.isArray(acl) || JSON.stringify([...acl].sort()) !== JSON.stringify([...expected.acl].sort()))
      throw new Error(`Metadata mismatch: ${row.signature}`);
    return { signature: row.signature, bytes, md5, sha256: digest('sha256', bytes), metadata: row };
  });
}

export function main(args) {
  if (args.length !== 1 && !(args.length === 3 && args[1] === '--preserve-human-reviewed-current-state'))
    throw new Error('Usage: node verify-helper-hex.mjs export.csv|export.json [--preserve-human-reviewed-current-state NEW_DIRECTORY]');
  const inputBytes = readFileSync(resolve(args[0]));
  const input = inputBytes.toString('utf8').replace(/^\uFEFF/, '');
  const reference = JSON.parse(readFileSync(referencePath, 'utf8'));
  const rows = args[0].toLowerCase().endsWith('.json') ? JSON.parse(input) : parseCsv(input);
  const verified = verifyRows(rows, reference);
  for (const h of verified) console.log(`PASS ${h.signature} MD5=${h.md5} bytes=${h.bytes.length}`);
  if (args.length === 1) {
    console.log('Verification only. No baseline files written; human body review still required.');
    return;
  }
  // The flag is a HUMAN assertion of completed review, never automatic approval.
  // Require a new directory, never overwrite an existing export or baseline.
  const output = resolve(args[2]);
  mkdirSync(output);
  writeFileSync(join(output, 'source-export.raw'), inputBytes, { flag: 'wx' });
  const helpers = verified.map(h => {
    const filename = h.signature.split('.')[1].split('(')[0] + '.sql';
    writeFileSync(join(output, filename), h.bytes, { flag: 'wx' });
    return { signature: h.signature, filename, md5: h.md5, sha256: h.sha256, metadata: h.metadata };
  });
  writeFileSync(join(output, 'CURRENT-STATE-BASELINE.json'), JSON.stringify({
    kind: 'verified-human-reviewed-current-state-only',
    project_ref_claimed_by_operator: reference.project_ref,
    project_identity_verified_by_script: false,
    bytes_verified: true, human_review_asserted_by_operator: true,
    historical_equivalence_verified: false, migration_execution_approved: false,
    source_export_sha256: digest('sha256', inputBytes), helpers,
  }, null, 2) + '\n', { flag: 'wx' });
  console.log('Preserved exact bytes after explicit human-review assertion. No migration approval.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`FAIL: ${error.message}`); process.exitCode = 1; }
}
