import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import * as extract from "../../app/api/documents/[id]/extract/route";
import * as esg from "../../app/api/documents/[id]/esg-extraction/route";
import { triggerEsgExtraction } from "../../components/upload/esg-extraction-action";
import { disabledWriteResponse } from "./disabled-writes";

for (const [name, route] of Object.entries({ extract, esg })) {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"] as const) {
    test(`${method} ${name} is the side-effect-free disabled handler`, async () => {
      assert.equal(route[method], disabledWriteResponse);
      const response = route[method]();
      assert.equal(response.status, 503);
      assert.equal((await response.json()).error.code, "writes_disabled");
      assert.match(response.headers.get("Cache-Control") ?? "", /no-store/);
    });
  }
}

// Next supplies the server-only alias at build time. Avoid loading Next's request
// runtime in plain Node tests; verify these routes use the exact tested handler.
for (const file of ["src/app/api/documents/route.ts", "src/app/api/documents/[id]/validation/route.ts"]) {
  test(`${file} binds every mutation directly to disabled handler`, () => {
    const source = readFileSync(resolve(file), "utf8");
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      assert.ok(source.includes(`export const ${method} = disabledWriteResponse;`));
    }
    assert.doesNotMatch(source, /\.insert\(|\.update\(|\.delete\(|\.storage\b|extractStructured/);
  });
}

test("direct extraction action never reads document input, credentials, or a client", async () => {
  const input = new Proxy({}, { get() { throw new Error("Input must not be accessed"); } });
  assert.deepEqual(await triggerEsgExtraction(input as unknown as string), { success: false, code: "writes_disabled", status: 503 });
  const source = readFileSync(resolve("src/components/upload/esg-extraction-action.ts"), "utf8");
  assert.doesNotMatch(source, /\bimport\b|process\.env|fetch\(|\.from\(|\.storage|\.auth/);
  const disabled = readFileSync(resolve("src/lib/security/disabled-writes.ts"), "utf8");
  assert.doesNotMatch(disabled, /\bimport\b|process\.env|fetch\(|\.from\(|\.storage|\.auth/);
});

test("all document read entry import graphs exclude privileged and AI code", () => {
  const seen = new Set<string>();
  function inspect(file: string) {
    if (seen.has(file)) return;
    seen.add(file);
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /getSupabaseAdmin|SUPABASE_SECRET_KEY|MVP_API_ACCESS_TOKEN|\.storage\b|\.admin\b|extractStructuredEsgData|\.rpc\(/);
    for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) {
      const name = match[1];
      if (name.startsWith("@/")) inspect(resolve("src", name.slice(2)) + ".ts");
      else if (name.startsWith(".")) inspect(resolve(dirname(file), name) + ".ts");
    }
  }
  for (const file of ["src/app/api/documents/route.ts", "src/app/api/documents/[id]/validation/route.ts", "src/components/validation/validation-data-action.ts", "src/lib/esg/validation-service.ts"]) inspect(resolve(file));
});
