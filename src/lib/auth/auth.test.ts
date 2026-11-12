import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { authConfiguration, confirmationOrigin, safeAuthRedirect } from "./policy";
import { confirmEmail, loginWithPassword, registerWithEmail, signOutSession, type AuthPort } from "./service";
import { propagateAuthCookies } from "./cookies";

function mockAuth(overrides: Partial<AuthPort> = {}) {
  const calls: string[] = [];
  const auth: AuthPort = {
    async signInWithPassword(input) { calls.push("login"); assert.equal(input.email, "user@example.com"); return { error: null }; },
    async signUp(input) { calls.push("signup"); assert.equal(input.options.emailRedirectTo, "http://localhost:3000/auth/confirm"); return { error: null }; },
    async signOut() { calls.push("logout"); return { error: null }; },
    async getUser() { calls.push("getUser"); return { data: { user: { id: "test-user" } }, error: null }; },
    async exchangeCodeForSession() { calls.push("exchange"); return { error: null }; },
    async verifyOtp() { calls.push("verify"); return { error: null }; },
    ...overrides,
  };
  return { auth, calls };
}

for (const input of [undefined, null, "https://evil.example", "//evil.example", "/\\evil.example", "/%2f%2fevil", "/dashboard?next=https://evil", "/dashboard#token", "/auth/confirm", "/api/documents", "/login", "/register", "/x\n"]) {
  test(`unsafe redirect rejected: ${JSON.stringify(input)}`, () => assert.equal(safeAuthRedirect(input), "/dashboard"));
}
test("safe local path retained", () => assert.equal(safeAuthRedirect("/settings"), "/settings"));

test("public config permits only isolated test target and public keys", () => {
  const url = "https://gkhrtrakukqdhgvucudv.supabase.co";
  assert.equal(authConfiguration(url, "sb_publishable_synthetic").url, url);
  const jwt = (role: string) => `synthetic.${btoa(JSON.stringify({ role }))}.synthetic`;
  assert.equal(authConfiguration(url, jwt("anon")).url, url);
  for (const key of [undefined, "sb_secret_synthetic", jwt("service_role"), "invalid"]) assert.throws(() => authConfiguration(url, key));
  for (const target of [undefined, "https://other.supabase.co", `${url}/`, `${url}.evil`]) assert.throws(() => authConfiguration(target, "sb_publishable_synthetic"));
});
test("confirmation origin rejects missing, credentialed, remote HTTP and path URLs", () => {
  assert.equal(confirmationOrigin("http://localhost:3000"), "http://localhost:3000");
  assert.equal(confirmationOrigin("https://test.example.com"), "https://test.example.com");
  for (const value of [undefined, "http://remote.example", "https://user:secret@test.example", "https://test.example/path", "https://test.example/"]) assert.throws(() => confirmationOrigin(value));
});
test("login verifies identity after password authentication", async () => {
  const { auth, calls } = mockAuth();
  assert.equal(await loginWithPassword(auth, " user@example.com ", "password"), true);
  assert.deepEqual(calls, ["login", "getUser"]);
});
test("empty login does not invoke Auth", async () => {
  const { auth, calls } = mockAuth();
  assert.equal(await loginWithPassword(auth, "", ""), false);
  assert.deepEqual(calls, []);
});
test("failed login cannot acquire verified identity", async () => {
  const { auth, calls } = mockAuth({ async signInWithPassword() { return { error: new Error("synthetic") }; } });
  assert.equal(await loginWithPassword(auth, "user@example.com", "password"), false);
  assert.deepEqual(calls, []);
});
for (const result of [{ data: { user: null }, error: null }, { data: { user: { id: "untrusted" } }, error: new Error("invalid") }]) {
  test(`login denies unverified user: ${!!result.error}`, async () => {
    const { auth } = mockAuth({ async getUser() { return result; } });
    assert.equal(await loginWithPassword(auth, "user@example.com", "password"), false);
  });
}
test("registration requests confirmation and never provisions membership", async () => {
  const { auth, calls } = mockAuth();
  assert.equal(await registerWithEmail(auth, "Test", "user@example.com", "password", "http://localhost:3000"), true);
  assert.deepEqual(calls, ["signup"]);
});
test("registration rejects weak/empty input before signup", async () => {
  const { auth, calls } = mockAuth();
  assert.equal(await registerWithEmail(auth, "Test", "user@example.com", "short", "http://localhost:3000"), false);
  assert.deepEqual(calls, []);
});
for (const [query, expected] of [["code=synthetic", "exchange"], ["token_hash=synthetic&type=signup", "verify"], ["token_hash=synthetic&type=email", "verify"]]) {
  test(`confirmation ${expected} followed by getUser`, async () => {
    const { auth, calls } = mockAuth();
    assert.equal(await confirmEmail(auth, new URLSearchParams(query)), true);
    assert.deepEqual(calls, [expected, "getUser"]);
  });
}
for (const query of ["", "token_hash=synthetic&type=recovery", "token_hash=synthetic", "code=a&token_hash=b&type=signup"]) {
  test(`invalid confirmation does not contact Auth: ${query}`, async () => {
    const { auth, calls } = mockAuth();
    assert.equal(await confirmEmail(auth, new URLSearchParams(query)), false);
    assert.deepEqual(calls, []);
  });
}
test("failed code exchange never verifies a session", async () => {
  const { auth, calls } = mockAuth({ async exchangeCodeForSession() { return { error: true }; } });
  assert.equal(await confirmEmail(auth, new URLSearchParams("code=synthetic")), false);
  assert.deepEqual(calls, []);
});
test("logout invokes Supabase signOut and propagates failure", async () => {
  const { auth, calls } = mockAuth();
  assert.equal(await signOutSession(auth), true);
  assert.deepEqual(calls, ["logout"]);
  const failed = mockAuth({ async signOut() { return { error: true }; } });
  assert.equal(await signOutSession(failed.auth), false);
});
test("refresh and deletion cookies preserve options and no-cache headers on response", () => {
  const cookies = [{ name: "auth.0", value: "synthetic", options: { sameSite: "lax" as const, secure: true } }, { name: "auth.1", value: "", options: { maxAge: 0 } }];
  const request: Record<string, string> = {};
  const response: typeof cookies = [];
  const headers: Record<string, string> = {};
  propagateAuthCookies(cookies, { "Cache-Control": "private, no-store", Pragma: "no-cache" },
    (name, value) => { request[name] = value; },
    (cookie) => { response.push(cookie as typeof cookies[number]); },
    (name, value) => { headers[name] = value; });
  assert.deepEqual(request, { "auth.0": "synthetic", "auth.1": "" });
  assert.deepEqual(response, cookies);
  assert.equal(headers["Cache-Control"], "private, no-store");
  assert.equal(headers.Pragma, "no-cache");
});

test("auth server entry points cannot import privileged database or document services", () => {
  const visited = new Set<string>();
  function inspect(file: string) {
    if (visited.has(file)) return;
    visited.add(file);
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /getSupabaseAdmin|SUPABASE_SECRET_KEY|MVP_API_ACCESS_TOKEN|\.from\(|\.rpc\(|\.storage\b|\.admin\b/);
    for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) {
      const name = match[1];
      if (name.startsWith("@/")) inspect(resolve("src", name.slice(2)) + ".ts");
      else if (name.startsWith(".")) inspect(resolve(dirname(file), name) + ".ts");
    }
  }
  for (const entry of ["src/lib/auth/actions.ts", "src/app/auth/confirm/route.ts", "src/proxy.ts"]) inspect(resolve(entry));
});
