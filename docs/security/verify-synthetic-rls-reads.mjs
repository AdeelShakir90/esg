import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { requireIntegrationTarget } from '../../src/lib/security/integration-target.ts';

const personas = new Map([
  ['owner_a', { visible: 'A1', role: 'owner' }],
  ['owner_b', { visible: 'B1', role: 'owner' }],
  ['reviewer_a', { visible: 'A1', role: 'reviewer' }],
  ['member_a', {}], ['suspended_a', {}], ['outsider', {}], ['anonymous', {}],
]);
const tables = [
  'documents', 'esg_extractions', 'extracted_esg_fields', 'organizations', 'organization_memberships',
];

class SafeResult extends Error {}

function requireUuid(value, label) {
  if (!value || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value)) {
    throw new SafeResult(`Provide the verified ${label} UUID privately.`);
  }
  return value.toLowerCase();
}

function sameRows(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length &&
    expected.every(row => actual.some(item => item && Object.entries(row).every(([key, value]) => item[key] === value)));
}

function tokenMatchesIdentity(token, userId) {
  if (typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return claims.role === 'authenticated' && claims.sub === userId;
  } catch {
    return false;
  }
}

const storageProbeReasons = new Map([
  ['NoSuchKey', 'Object missing or hidden'], ['not_found', 'Resource missing or hidden'],
  ['AccessDenied', 'Storage reported access denial'], ['Unauthorized', 'Authorization rejected'],
  ['unauthorized', 'Authorization rejected'], ['InvalidJWT', 'Token rejected'],
  ['NoSuchBucket', 'Bucket missing or unavailable'], ['TenantNotFound', 'Tenant unavailable'],
  ['InvalidRequest', 'Request rejected'], ['InvalidKey', 'Object path rejected'],
  ['InternalError', 'Storage service error'], ['DatabaseError', 'Storage database error'],
  ['DatabaseTimeout', 'Storage database timeout'],
]);

function reportStorageProbe(status, error, hasData) {
  const sdkCode = [error?.code, error?.statusCode].find(code => storageProbeReasons.has(code));
  const legacyCode = typeof error?.statusCode === 'string' && /^[45][0-9]{2}$/.test(error.statusCode)
    ? error.statusCode : null;
  const legacyNotFound = !error?.code && legacyCode === '404' &&
    typeof error.message === 'string' && error.message.trim().toLowerCase() === 'object not found';
  const reason = hasData ? 'Unexpected object data returned'
    : legacyNotFound ? 'Legacy object missing or hidden response'
    : storageProbeReasons.get(sdkCode) ?? (status ? 'Unrecognized response details withheld' : 'No HTTP response observed');
  console.log(`HTTP ${status ?? 'unavailable'} | SDK code ${sdkCode ?? legacyCode ?? 'unavailable or unrecognized'} | ${reason}`);
}

async function main() {
  const [name, ...extra] = process.argv.slice(2);
  const persona = personas.get(name);
  const diagnoseB1 = name === 'owner_a' && extra.length === 1 && extra[0] === '--diagnose-b1';
  if (!persona || (extra.length && !diagnoseB1)) throw new SafeResult('Choose one reviewed persona or the Owner A B1 diagnostic.');
  if (process.env.ENVARIO_RLS_LIVE_APPROVED !== 'true') {
    throw new SafeResult('Separate live execution approval is required.');
  }
  const target = requireIntegrationTarget({
    optIn: process.env.ENVARIO_FIXTURE_OPT_IN,
    projectRef: process.env.ENVARIO_FIXTURE_PROJECT_REF,
    supabaseUrl: process.env.ENVARIO_FIXTURE_PROJECT_URL,
  });
  const key = process.env.ENVARIO_RLS_PUBLISHABLE_KEY?.trim();
  if (!key || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    throw new SafeResult('Use the isolated project Publishable key for persona reads.');
  }
  const orgA = requireUuid(process.env.ENVARIO_FIXTURE_ORG_A, 'organization A');
  const orgB = requireUuid(process.env.ENVARIO_FIXTURE_ORG_B, 'organization B');
  if (orgA === orgB) throw new SafeResult('The two fixture organizations must be distinct.');
  const anonymous = name === 'anonymous';
  const userId = anonymous ? null : requireUuid(process.env.ENVARIO_RLS_USER_ID, 'persona Auth user');
  const email = process.env.ENVARIO_RLS_EMAIL;
  const password = process.env.ENVARIO_RLS_PASSWORD;
  if (!anonymous && (!email || !password)) throw new SafeResult('Provide the synthetic sign-in credentials privately.');

  const fixtures = [['A1', orgA, orgA], ['B1', orgB, orgB], ['U1', null, orgA]].map(([label, organization, folder], i) => {
    const suffix = String(i + 1).padStart(12, '0');
    const document = `70170000-0000-4000-8000-${suffix}`;
    return {
      label, organization, folder, document,
      extraction: `71170000-0000-4000-8000-${suffix}`,
      field: `72170000-0000-4000-8000-${suffix}`,
      filename: `${document}.pdf`, path: `${folder}/${document}.pdf`,
    };
  });
  const expected = fixtures.filter(fixture => fixture.label === persona.visible);
  const probeFixture = fixtures.find(fixture => fixture.label === 'B1');
  const objectRoutes = new Set((diagnoseB1 ? [probeFixture] : fixtures)
    .map(fixture => `/storage/v1/object/documents/${fixture.path}`));
  const tableRoutes = new Set(tables.map(table => `/rest/v1/${table}`));
  const origin = new URL(target.supabaseUrl).origin;
  let token = null;
  let identityVerified = anonymous;
  let probeStatus;
  const client = createClient(target.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init) => {
        const url = new URL(input);
        const method = init?.method ?? 'GET';
        if (url.origin !== origin || url.username || url.password || url.hash) {
          throw new SafeResult('Request target rejected.');
        }
        const signIn = !anonymous && !token && method === 'POST' &&
          url.pathname === '/auth/v1/token' && url.search === '?grant_type=password';
        const verifyIdentity = !anonymous && token && !identityVerified && method === 'GET' &&
          url.pathname === '/auth/v1/user' && !url.search;
        const tableRead = !diagnoseB1 && method === 'GET' && tableRoutes.has(url.pathname);
        const storageRead = !url.search && (
          (method === 'GET' && objectRoutes.has(url.pathname)) ||
          (!diagnoseB1 && method === 'POST' && url.pathname === '/storage/v1/object/list/documents')
        );
        if (!signIn && !verifyIdentity && !(identityVerified && (tableRead || storageRead))) {
          throw new SafeResult('Request is outside the approved read scope.');
        }
        const headers = new Headers(init?.headers);
        const authorization = headers.get('authorization');
        if (signIn || anonymous) {
          if (authorization !== null && authorization !== `Bearer ${key}`) {
            throw new SafeResult('Unexpected session on a request without user authentication.');
          }
          headers.delete('authorization');
        } else if (authorization !== `Bearer ${token}`) {
          throw new SafeResult('Request is missing the verified persona token.');
        }
        headers.set('apikey', key);
        const response = await fetch(url.href, { ...init, headers, redirect: 'error', cache: 'no-store' });
        if (diagnoseB1 && storageRead) probeStatus = response.status;
        return response;
      },
    },
  });

  if (!anonymous) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !tokenMatchesIdentity(data.session?.access_token, userId)) {
      throw new SafeResult('Sign-in did not establish the expected authenticated persona.');
    }
    token = data.session.access_token;
    const verified = await client.auth.getUser();
    if (verified.error || verified.data.user?.id !== userId) {
      throw new SafeResult('Auth user verification failed.');
    }
    identityVerified = true;
    if (!diagnoseB1) console.log(`${name} | Auth identity | VERIFIED`);
  } else {
    console.log('anonymous | no user session | VERIFIED');
  }

  const bucket = client.storage.from('documents');
  if (diagnoseB1) {
    try {
      const { data, error } = await bucket.download(probeFixture.path);
      reportStorageProbe(probeStatus, error, data !== null && data !== undefined);
    } catch (error) {
      reportStorageProbe(probeStatus, error, false);
    }
    return;
  }

  async function assertRows(label, request, expectedRows) {
    const { data, error } = await request;
    if (error) {
      if (anonymous && !expectedRows.length && data === null && error.code === '42501') {
        console.log(`${name} | ${label} | PASS | privilege denied`);
        return;
      }
      throw new SafeResult(`${name} | ${label} | INCONCLUSIVE | API read failed`);
    }
    if (!sameRows(data, expectedRows)) throw new SafeResult(`${name} | ${label} | FAIL | unexpected row set`);
    console.log(`${name} | ${label} | PASS | rows=${data.length}`);
  }

  const reads = [
    { table: 'documents', projection: 'id,organization_id', filter: 'id',
      input: fixture => fixture.document, row: fixture => ({ id: fixture.document, organization_id: fixture.organization }) },
    { table: 'esg_extractions', projection: 'id,document_id', filter: 'document_id',
      input: fixture => fixture.document, row: fixture => ({ id: fixture.extraction, document_id: fixture.document }) },
    { table: 'extracted_esg_fields', projection: 'id,extraction_id', filter: 'extraction_id',
      input: fixture => fixture.extraction, row: fixture => ({ id: fixture.field, extraction_id: fixture.extraction }) },
  ];
  for (const read of reads) {
    const query = () => client.from(read.table).select(read.projection);
    await assertRows(`${read.table} list`, query().in(read.filter, fixtures.map(read.input)), expected.map(read.row));
    for (const fixture of fixtures) {
      const row = read.row(fixture);
      await assertRows(`${read.table} ${fixture.label}`, query().eq('id', row.id),
        expected.includes(fixture) ? [row] : []);
    }
  }
  await assertRows('organizations', client.from('organizations').select('id').in('id', [orgA, orgB]),
    expected.map(fixture => ({ id: fixture.organization })));
  await assertRows('organization_memberships', client.from('organization_memberships')
    .select('organization_id,user_id,role,status').in('organization_id', [orgA, orgB]),
  expected.map(fixture => ({ organization_id: fixture.organization, user_id: userId, role: persona.role, status: 'active' })));

  for (const [label, folder] of [['A', orgA], ['B', orgB]]) {
    await assertRows(`Storage list ${label}`, bucket.list(folder, { limit: 100, offset: 0 }),
      expected.filter(fixture => fixture.folder === folder).map(fixture => ({ name: fixture.filename })));
  }
  for (const fixture of fixtures) {
    const { data, error } = await bucket.download(fixture.path);
    if (!expected.includes(fixture)) {
      const status = Number(error?.status);
      const code = error?.code ?? error?.statusCode;
      const denied = (code === 'AccessDenied' && [400, 403].includes(status)) ||
        // The isolated project masks a known-present object with NoSuchKey at HTTP 400.
        (code === 'NoSuchKey' && [400, 404].includes(status)) ||
        (status === 404 && code === '404' && error?.message?.toLowerCase() === 'object not found');
      if (data) throw new SafeResult(`${name} | Storage ${fixture.label} | FAIL | unexpected download`);
      if (!denied) throw new SafeResult(`${name} | Storage ${fixture.label} | INCONCLUSIVE | unrecognized denial`);
      console.log(`${name} | Storage ${fixture.label} | PASS | denied HTTP ${status}`);
      continue;
    }
    if (error || !data) throw new SafeResult(`${name} | Storage ${fixture.label} | FAIL | positive download failed`);
    const bytes = Buffer.from(await data.arrayBuffer());
    const valid = data.type === 'application/pdf' && bytes.length === 1638 &&
      createHash('sha256').update(bytes).digest('hex').toUpperCase() ===
        '113DF6E64181DCD497B469848BAC07108645B293734A195487C0D039B87F6E3A';
    if (!valid) throw new SafeResult(`${name} | Storage ${fixture.label} | FAIL | PDF integrity mismatch`);
    console.log(`${name} | Storage ${fixture.label} | PASS | size and SHA-256 match`);
  }
  console.log(`${name} READ CHECKS COMPLETE`);
}

main().catch(error => {
  console.error(`STOP: ${error instanceof SafeResult ? error.message : 'Unexpected failure. Private details withheld.'}`);
  process.exitCode = 1;
});
