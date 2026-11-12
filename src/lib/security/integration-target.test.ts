import assert from "node:assert/strict";
import test from "node:test";

import { requireIntegrationTarget, SECURITY_TEST_PROJECT_REF } from "./integration-target";

const approved = {
  optIn: "true",
  projectRef: SECURITY_TEST_PROJECT_REF,
  supabaseUrl: `https://${SECURITY_TEST_PROJECT_REF}.supabase.co`,
};

test("accepts only the explicit approved target and normalizes a trailing slash", () => {
  for (const suffix of ["", "/"]) {
    const target = requireIntegrationTarget({ ...approved, supabaseUrl: approved.supabaseUrl + suffix });
    assert.deepEqual(target, { projectRef: approved.projectRef, supabaseUrl: approved.supabaseUrl });
    assert.equal(Object.isFrozen(target), true);
  }
});

const rejected = [
  { name: "empty configuration", config: {} },
  ...[undefined, "", "false", "1", "TRUE", " true "].map((optIn) => ({ name: `opt-in ${String(optIn)}`, config: { ...approved, optIn } })),
  ...[undefined, "", "other-project", `${SECURITY_TEST_PROJECT_REF}x`].map((projectRef) => ({ name: `ref ${String(projectRef)}`, config: { ...approved, projectRef } })),
  ...[
    undefined, "", "https://other-project.supabase.co", "http://localhost:54321",
    approved.supabaseUrl.replace("https:", "http:"),
    `${approved.supabaseUrl}.evil.example`, `${approved.supabaseUrl}/rest/v1`,
    `${approved.supabaseUrl}?token=secret`, `${approved.supabaseUrl}#fragment`,
    `https://user:secret@${SECURITY_TEST_PROJECT_REF}.supabase.co`,
    `https://${SECURITY_TEST_PROJECT_REF}.supabase.co@evil.example`,
    `${approved.supabaseUrl}:443`, ` ${approved.supabaseUrl}`, `${approved.supabaseUrl}//`,
    "not a URL",
  ].map((supabaseUrl, index) => ({ name: `URL case ${index}`, config: { ...approved, supabaseUrl } })),
];

for (const entry of rejected) {
  test(`rejects ${entry.name} before client creation or request`, () => {
    let clientCreations = 0;
    let requests = 0;
    assert.throws(() => {
      requireIntegrationTarget(entry.config);
      // Future integration runners must preserve this preflight ordering.
      clientCreations += 1;
      requests += 1;
    }, { message: "Security integration tests require explicit approved target configuration." });
    assert.equal(clientCreations, 0);
    assert.equal(requests, 0);
  });
}

test("has no fallback when explicit test configuration is absent", () => {
  // This test does not read application environment variables or any env file.
  assert.throws(() => requireIntegrationTarget({ optIn: "true" }));
});
