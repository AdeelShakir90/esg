import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { createClient } from '@supabase/supabase-js';
import { requireIntegrationTarget } from '../../src/lib/security/integration-target.ts';

const expectedBytes = 1638;
const expectedHash = '113DF6E64181DCD497B469848BAC07108645B293734A195487C0D039B87F6E3A';
const fixtures = new Map([
  ['A1', { folder: 'ENVARIO_FIXTURE_ORG_A', id: '70170000-0000-4000-8000-000000000001' }],
  ['B1', { folder: 'ENVARIO_FIXTURE_ORG_B', id: '70170000-0000-4000-8000-000000000002' }],
  ['U1', { folder: 'ENVARIO_FIXTURE_ORG_A', id: '70170000-0000-4000-8000-000000000003' }],
]);

function matchesPayload(bytes) {
  return bytes.length === expectedBytes &&
    createHash('sha256').update(bytes).digest('hex').toUpperCase() === expectedHash;
}

const safeStorageReasons = new Map([
  ['InvalidRequest', 'Invalid Storage request'],
  ['InvalidMimeType', 'Unsupported content type'],
  ['InvalidKey', 'Invalid object name'],
  ['InvalidBucketName', 'Invalid bucket name'],
  ['InvalidJWT', 'Invalid authentication token'],
  ['AccessDenied', 'Storage access denied'],
  ['Unauthorized', 'Storage authorization failed'],
  ['NoSuchBucket', 'Storage bucket unavailable'],
  ['NoSuchKey', 'Storage object unavailable'],
  ['ResourceAlreadyExists', 'Object already exists'],
  ['EntityTooLarge', 'Payload exceeds the size limit'],
  ['MissingContentLength', 'Content length is missing'],
]);

// Only operator-facing messages constructed in this script may reach STOP output.
class SafeOperatorError extends Error {}

function storageDiagnostic(error) {
  const status = String(error?.status ?? error?.statusCode ?? '');
  const code = [error?.code, error?.statusCode].find(value => safeStorageReasons.has(value));
  // Server messages may contain paths or credentials. Emit only fixed phrases.
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
  const reason = message.includes('invalid api key') ? 'Invalid API key'
    : message.includes('row-level security') ? 'Row-level security rejected the request'
    : message.includes('mime type') ? 'Storage reported a MIME type error'
    : safeStorageReasons.get(code) ?? 'Unrecognized response message withheld';
  return `HTTP ${/^[45][0-9]{2}$/.test(status) ? status : 'unavailable'} | ` +
    `SDK code ${code ?? 'unavailable or unrecognized'} | ${reason}`;
}

async function main() {
  const [mode, label, ...extra] = process.argv.slice(2);
  const fixture = fixtures.get(label);
  if (!['check', 'upload'].includes(mode) || !fixture || extra.length) {
    throw new SafeOperatorError('Choose check or upload and exactly one fixture: A1, B1 or U1.');
  }
  let target;
  try {
    target = requireIntegrationTarget({
      optIn: process.env.ENVARIO_FIXTURE_OPT_IN,
      projectRef: process.env.ENVARIO_FIXTURE_PROJECT_REF,
      supabaseUrl: process.env.ENVARIO_FIXTURE_PROJECT_URL,
    });
  } catch {
    throw new SafeOperatorError('Check the isolated project ref, URL and integration opt-in.');
  }
  const folder = process.env[fixture.folder]?.trim().toLowerCase();
  if (!folder || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(folder)) {
    throw new SafeOperatorError('Enter the verified organization UUID for this fixture.');
  }
  const path = `${folder}/${fixture.id}.pdf`;
  const pdf = await readFile(new URL('../../output/pdf/envario-rls-synthetic.pdf', import.meta.url));
  if (!matchesPayload(pdf)) throw new SafeOperatorError('Local PDF does not match the approved bytes and SHA-256.');

  console.log(`${label} | ${target.projectRef} | documents/${path}`);
  console.log(`${expectedBytes} bytes | SHA-256 ${expectedHash} | upsert: false`);
  if (mode === 'check') return;

  const key = process.env.ENVARIO_FIXTURE_STORAGE_KEY?.trim();
  if (!key || !/^sb_secret_[A-Za-z0-9_-]+$/.test(key)) {
    throw new SafeOperatorError('Provide the isolated project modern Secret key privately.');
  }
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  let confirmation;
  try {
    confirmation = await prompt.question(`Compare the path with your private manifest. Type ${label} to upload: `);
  } finally {
    prompt.close();
  }
  if (confirmation !== label) throw new SafeOperatorError('Confirmation did not match.');

  const objectUrl = new URL(`/storage/v1/object/documents/${path}`, target.supabaseUrl).href;
  const client = createClient(target.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init) => {
        if (String(input) !== objectUrl || !['POST', 'GET'].includes(init?.method)) {
          throw new SafeOperatorError('Request is outside the selected fixture Storage endpoint.');
        }
        const headers = new Headers(init.headers);
        const authorization = headers.get('Authorization');
        if (authorization !== null && authorization !== `Bearer ${key}`) {
          throw new SafeOperatorError('Unexpected authorization on the fixture request.');
        }
        // Strip the SDK's key-as-Bearer fallback before the request leaves this process.
        headers.delete('Authorization');
        headers.set('apikey', key);
        return fetch(objectUrl, { ...init, headers, redirect: 'error' });
      },
    },
  });
  const bucket = client.storage.from('documents');
  let phase = 'upload';
  try {
    const { data, error } = await bucket.upload(path, pdf, { contentType: 'application/pdf', upsert: false });
    if (error) throw error;
    if (data?.path !== path) {
      phase = 'upload receipt path check';
      throw new Error();
    }
    console.log(`${label} upload acknowledged. Keep this path and object ID privately: ${data.id}`);
    phase = 'download';
    const { data: object, error: downloadError } = await bucket.download(path);
    if (downloadError) throw downloadError;
    phase = 'download content check';
    if (!object || object.type !== 'application/pdf' ||
        !matchesPayload(Buffer.from(await object.arrayBuffer()))) throw new Error();
  } catch (error) {
    throw new SafeOperatorError(`${label} ${phase} failed. ${storageDiagnostic(error)}. Reconcile the exact path before retrying.`);
  }
  console.log(`${label} UPLOADED AND VERIFIED`);
}

main().catch(error => {
  const message = error instanceof SafeOperatorError
    ? error.message
    : 'Unexpected failure. Details withheld. Check the exact path before retrying.';
  console.error(`STOP: ${message}`);
  process.exitCode = 1;
});
