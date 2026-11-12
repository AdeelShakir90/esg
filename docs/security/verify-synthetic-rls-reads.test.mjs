import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const ref = 'gkhrtrakukqdhgvucudv';
const origin = `https://${ref}.supabase.co`;
const orgA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const orgB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const userId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const key = 'sb_publishable_offline_fixture';
const email = 'offline-persona@example.com';
const password = 'offline-password-placeholder';

function run(persona, { overrides = {}, wrongIdentity = false, jwtRole = 'authenticated', leak = false, probe = null, b1Error = null } = {}) {
  const encoded = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const jwt = `${encoded({ alg: 'HS256', typ: 'JWT' })}.${encoded({ sub: userId, role: jwtRole, exp: 2000000000 })}.c2ln`;
  const config = { origin, orgA, orgB, userId, key, email, password, jwt, persona, wrongIdentity, leak, probe, b1Error };
  // Replace fetch before importing the runner. The installed SDK uses this stub for every request.
  const preload = String.raw`
    import assert from 'node:assert/strict';
    import { readFileSync } from 'node:fs';
    const c = ${JSON.stringify(config)};
    const fixtureNumber = c.persona === 'owner_b' ? 2 : 1;
    const organization = fixtureNumber === 2 ? c.orgB : c.orgA;
    const id = prefix => prefix + '-0000-4000-8000-00000000000' + fixtureNumber;
    const doc = id('70170000');
    const extraction = id('71170000');
    const field = id('72170000');
    const visible = ['owner_a', 'owner_b', 'reviewer_a'].includes(c.persona);
    const user = { id: c.userId, role: 'authenticated', aud: 'authenticated', app_metadata: {}, user_metadata: {} };
    globalThis.fetch = async (input, init) => {
      const url = new URL(input);
      const headers = new Headers(init?.headers);
      const method = init?.method ?? 'GET';
      assert.equal(url.origin, c.origin);
      assert.equal(init.redirect, 'error');
      assert.equal(headers.get('apikey'), c.key);
      if (url.pathname === '/auth/v1/token') {
        assert.equal(method, 'POST');
        assert.equal(url.search, '?grant_type=password');
        assert.equal(headers.has('authorization'), false);
        const body = JSON.parse(init.body);
        assert.equal(body.email, c.email);
        assert.equal(body.password, c.password);
        console.log('MOCK SIGN_IN');
        return Response.json({ access_token: c.jwt, refresh_token: 'offline-refresh', expires_in: 3600, user });
      }
      assert.equal(headers.get('authorization'), c.persona === 'anonymous' ? null : 'Bearer ' + c.jwt);
      if (url.pathname === '/auth/v1/user') {
        assert.equal(method, 'GET');
        console.log('MOCK GET_USER');
        return Response.json(c.wrongIdentity ? { ...user, id: c.orgB } : user);
      }
      if (c.probe) {
        assert.equal(method, 'GET');
        assert.equal(url.pathname, '/storage/v1/object/documents/' + c.orgB + '/70170000-0000-4000-8000-000000000002.pdf');
        assert.equal(url.search, '');
        console.log('MOCK B1_PROBE');
        if (c.probe === 'legacy') return Response.json({ statusCode: '404', message: 'Object not found' }, { status: 400 });
        if (c.probe === 'jwt') return Response.json({ code: 'InvalidJWT', message: 'Private detail ' + c.jwt }, { status: 401 });
        if (c.probe === 'transport') throw new Error('Private detail ' + c.key + ' ' + c.orgB);
        return new Response('Unexpected bytes', { status: 200 });
      }
      console.log('MOCK DATA_READ');
      if (url.pathname.startsWith('/rest/v1/')) {
        assert.equal(method, 'GET');
        const rows = {
          documents: { id: doc, organization_id: organization },
          esg_extractions: { id: extraction, document_id: doc },
          extracted_esg_fields: { id: field, extraction_id: extraction },
          organizations: { id: organization },
          organization_memberships: { organization_id: organization, user_id: c.userId,
            role: c.persona === 'reviewer_a' ? 'reviewer' : 'owner', status: 'active' },
        };
        const row = rows[url.pathname.slice('/rest/v1/'.length)];
        assert.ok(row);
        const filter = url.searchParams.get('id');
        const match = !filter?.startsWith('eq.') || filter === 'eq.' + row.id;
        return Response.json((visible && match) || c.leak ? [row] : []);
      }
      if (url.pathname === '/storage/v1/object/list/documents') {
        assert.equal(method, 'POST');
        const { prefix } = JSON.parse(init.body);
        assert.ok([c.orgA, c.orgB].includes(prefix.replace(/\/$/, '')));
        return Response.json(visible && prefix.replace(/\/$/, '') === organization ? [{name: doc + '.pdf'}] : []);
      }
      assert.equal(method, 'GET');
      const paths = [
        c.orgA + '/70170000-0000-4000-8000-000000000001.pdf',
        c.orgB + '/70170000-0000-4000-8000-000000000002.pdf',
        c.orgA + '/70170000-0000-4000-8000-000000000003.pdf',
      ].map(path => '/storage/v1/object/documents/' + path);
      assert.ok(paths.includes(url.pathname));
      if (c.b1Error && url.pathname === paths[1]) {
        return Response.json({ code: c.b1Error.code, message: 'Private diagnostic detail ' + c.jwt }, { status: c.b1Error.status });
      }
      if (visible && url.pathname === paths[fixtureNumber - 1]) {
        return new Response(readFileSync('output/pdf/envario-rls-synthetic.pdf'), {
          headers: { 'Content-Type': 'application/pdf' },
        });
      }
      return Response.json({ code: 'NoSuchKey', message: 'Object not found' }, { status: 404 });
    };
  `;
  const result = spawnSync(process.execPath, [
    '--import', 'tsx', '--import', `data:text/javascript;base64,${Buffer.from(preload).toString('base64')}`,
    'docs/security/verify-synthetic-rls-reads.mjs', persona, ...(probe ? ['--diagnose-b1'] : []),
  ], {
    env: { Path: process.env.Path ?? process.env.PATH, SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP, TMP: process.env.TMP,
      ENVARIO_RLS_LIVE_APPROVED: 'true', ENVARIO_FIXTURE_OPT_IN: 'true',
      ENVARIO_FIXTURE_PROJECT_REF: ref, ENVARIO_FIXTURE_PROJECT_URL: origin,
      ENVARIO_FIXTURE_ORG_A: orgA, ENVARIO_FIXTURE_ORG_B: orgB, ENVARIO_RLS_USER_ID: userId,
      ENVARIO_RLS_PUBLISHABLE_KEY: key, ENVARIO_RLS_EMAIL: email, ENVARIO_RLS_PASSWORD: password, ...overrides },
    encoding: 'utf8', timeout: 15000,
  });
  assert.ifError(result.error);
  for (const value of [orgA, orgB, userId, key, email, password, jwt]) {
    assert.ok(!(result.stdout + result.stderr).includes(value), 'Private input reached shared output');
  }
  return result;
}

test('owner session uses the Publishable key and verified user JWT, with scoped reads only', () => {
  const r = run('owner_a');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /MOCK SIGN_IN\r?\nMOCK GET_USER\r?\nowner_a \| Auth identity \| VERIFIED/);
  assert.match(r.stdout, /Storage A1 \| PASS \| size and SHA-256 match/);
  assert.match(r.stdout, /Storage U1 \| PASS \| denied HTTP 404/);
  assert.match(r.stdout, /owner_a READ CHECKS COMPLETE/);
});

test('anonymous read requests carry no Authorization header', () => {
  const r = run('anonymous');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout, /MOCK SIGN_IN|MOCK GET_USER/);
  assert.match(r.stdout, /anonymous READ CHECKS COMPLETE/);
});

test('remaining personas use verified user sessions and the expected fixture visibility', () => {
  for (const [persona, allowed] of [
    ['owner_b', 'B1'], ['reviewer_a', 'A1'], ['member_a', null], ['suspended_a', null], ['outsider', null],
  ]) {
    const r = run(persona);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /MOCK SIGN_IN\r?\nMOCK GET_USER/);
    assert.match(r.stdout, new RegExp(persona + ' READ CHECKS COMPLETE'));
    for (const label of ['A1', 'B1', 'U1']) {
      const outcome = label === allowed ? 'size and SHA-256 match' : 'denied HTTP 404';
      assert.ok(r.stdout.includes(`Storage ${label} | PASS | ${outcome}`));
    }
  }
});

test('missing approval, wrong target and Secret keys stop before any request', () => {
  for (const overrides of [
    { ENVARIO_RLS_LIVE_APPROVED: 'false' },
    { ENVARIO_FIXTURE_PROJECT_URL: 'https://wrong.invalid' },
    { ENVARIO_RLS_PUBLISHABLE_KEY: 'sb_secret_offline' },
  ]) {
    const r = run('owner_a', { overrides });
    assert.equal(r.status, 1);
    assert.doesNotMatch(r.stdout, /MOCK/);
  }
});

test('wrong server identity and elevated JWT stop before any data read', () => {
  const wrong = run('owner_a', { wrongIdentity: true });
  assert.equal(wrong.status, 1);
  assert.match(wrong.stdout, /MOCK GET_USER/);
  assert.doesNotMatch(wrong.stdout, /MOCK DATA_READ/);
  const elevated = run('owner_a', { jwtRole: 'service_role' });
  assert.equal(elevated.status, 1);
  assert.doesNotMatch(elevated.stdout, /MOCK GET_USER|MOCK DATA_READ/);
});

test('unexpected protected rows stop the run without printing row data', () => {
  const r = run('member_a', { leak: true });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /FAIL \| unexpected row set/);
  assert.doesNotMatch(r.stdout, /READ CHECKS COMPLETE/);
});

test('diagnostic makes only the B1 GET after Auth and reports sanitized distinctions', () => {
  for (const [probe, line] of [
    ['legacy', 'HTTP 400 | SDK code 404 | Legacy object missing or hidden response'],
    ['jwt', 'HTTP 401 | SDK code InvalidJWT | Token rejected'],
    ['transport', 'HTTP unavailable | SDK code unavailable or unrecognized | No HTTP response observed'],
    ['success', 'HTTP 200 | SDK code unavailable or unrecognized | Unexpected object data returned'],
  ]) {
    const r = run('owner_a', { probe });
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(r.stdout.trim().split(/\r?\n/), ['MOCK SIGN_IN', 'MOCK GET_USER', 'MOCK B1_PROBE', line]);
  }
});

test('diagnostic rejects another persona or an unverified Owner A identity before a B1 request', () => {
  for (const [persona, wrongIdentity] of [['owner_b', false], ['owner_a', true]]) {
    const r = run(persona, { probe: 'legacy', wrongIdentity });
    assert.equal(r.status, 1);
    assert.doesNotMatch(r.stdout, /MOCK B1_PROBE|MOCK DATA_READ/);
  }
});

test('Owner A accepts the observed HTTP 400 NoSuchKey denial and still checks U1', () => {
  const r = run('owner_a', { b1Error: { status: 400, code: 'NoSuchKey' } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Storage B1 \| PASS \| denied HTTP 400/);
  assert.match(r.stdout, /Storage U1 \| PASS \| denied HTTP 404/);
  assert.match(r.stdout, /owner_a READ CHECKS COMPLETE/);
});

test('other HTTP 400 errors and NoSuchKey on server errors remain inconclusive', () => {
  for (const b1Error of [{ status: 400, code: 'InvalidRequest' }, { status: 400, code: 'NoSuchBucket' },
    { status: 500, code: 'NoSuchKey' }]) {
    const r = run('owner_a', { b1Error });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Storage B1 \| INCONCLUSIVE \| unrecognized denial/);
    assert.doesNotMatch(r.stdout, /Storage U1|READ CHECKS COMPLETE/);
  }
});
