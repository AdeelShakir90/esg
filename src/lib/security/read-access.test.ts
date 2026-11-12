import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { transpileModule, ModuleKind, ScriptTarget } from "typescript";
import { ESG_FIELD_DEFINITIONS } from "../esg/definitions";
import { ReadAccessError, readDocuments, readValidation, verifiedReadContext, type ReadPort } from "./read-access";
import { validationReadAction } from "./read-action";
import { documentsReadResponse, validationReadResponse } from "./read-routes";
import { DATABASE_READS_VERIFIED } from "./database-verification";

const docId = "11111111-1111-4111-8111-111111111111";
const runId = "22222222-2222-4222-8222-222222222222";
const date = "2026-10-06T10:00:00Z";
function fixture(role = "owner", status = "active", user: string | null = "user-a") {
  const calls: string[] = [];
  const document = { id: docId, organization_id: "org-a", file_name: "synthetic.pdf", extraction_status: "completed", extracted_at: date, parser_version: "unpdf-1" };
  const port: ReadPort = {
    async getUser() { calls.push("getUser"); return user ? { id: user } : null; },
    async memberships(userId) { calls.push("memberships"); assert.equal(userId, "user-a"); return [{ userId, organizationId: "org-a", role, status }]; },
    async documents(org) {
      calls.push("documents"); assert.equal(org, "org-a");
      return [{ ...document, created_at: date, file_type: "application/pdf", file_size: 100, status: "uploaded", extraction_status: "completed", page_count: 1, extraction_error: null }];
    },
    async document(id, org) { calls.push("document"); assert.equal(id, docId); assert.equal(org, "org-a"); return document; },
    async extractions(id) {
      calls.push("extractions"); assert.equal(id, docId);
      return [{ id: runId, document_id: docId, status: "completed", schema_version: "esg-core-v1", source_parser_version: "unpdf-1", source_extracted_at: date, created_at: date, completed_at: date }];
    },
    async fields(id) {
      calls.push("fields"); assert.equal(id, runId);
      return ESG_FIELD_DEFINITIONS.map((field, i) => ({
        id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`, extraction_id: runId,
        field_key: field.key, label: field.label, category: field.category, status: "not_found",
        value: null, unit: null, reporting_period_label: null, reporting_period_start: null, reporting_period_end: null,
        confidence: null, evidence_quote: null, evidence_page: null, validation_status: "pending", validated_value: null, updated_at: date,
      }));
    },
  };
  return { port, calls, document };
}

function denied(status: number) {
  return (error: unknown) => error instanceof ReadAccessError && error.status === status;
}

test("live database gate stays closed before any membership or document query", async () => {
  assert.equal(DATABASE_READS_VERIFIED, false);
  const { port, calls } = fixture();
  await assert.rejects(readDocuments(port, null), denied(503));
  assert.deepEqual(calls, ["getUser"]);
});

for (const gate of [true, false]) {
  test(`anonymous read returns 401 before membership/data lookup (gate ${gate})`, async () => {
    const { port, calls } = fixture("owner", "active", null);
    const response = await documentsReadResponse((selected) => readDocuments(port, selected, gate), new Request("http://local/api/documents"));
    assert.equal(response.status, 401);
    assert.deepEqual(calls, ["getUser"]);
  });
}

for (const role of ["owner", "reviewer"]) {
  test(`${role} reads only verified organization and safe document projection`, async () => {
    const { port } = fixture(role);
    const result = await readDocuments(port, "org-a", true);
    assert.equal(result.scopeKey, "user-a:org-a");
    assert.equal(result.documents.length, 1);
    assert.equal("organization_id" in result.documents[0], false);
    assert.equal("storage_path" in result.documents[0], false);
  });
  test(`${role} validation read and direct action invocation need no page guard`, async () => {
    const { port } = fixture(role);
    const result = await validationReadAction((id, selected) => readValidation(port, id, selected, true), docId, "org-a");
    assert.equal(result.success, true);
    if (result.success) { assert.equal(result.validation.fields.length, 12); assert.equal(result.scopeKey, "user-a:org-a"); }
  });
}

for (const [role, status] of [["member", "active"], ["member", "suspended"], ["owner", "suspended"], ["reviewer", "suspended"], ["admin", "active"]]) {
  test(`${status} ${role} denied before document reads`, async () => {
    const { port, calls } = fixture(role, status);
    await assert.rejects(readDocuments(port, "org-a", true), denied(403));
    assert.deepEqual(calls, ["getUser", "memberships"]);
    await assert.rejects(readValidation(port, docId, "org-a", true), denied(404));
  });
}

test("outsider and forged selected organization denied", async () => {
  const outsider = fixture(); outsider.port.memberships = async () => [];
  await assert.rejects(verifiedReadContext(outsider.port, "org-a", true), denied(403));
  await assert.rejects(verifiedReadContext(fixture().port, "org-b", true), denied(403));
  await assert.rejects(readValidation(fixture().port, docId, "org-b", true), denied(404));
});
test("multiple organizations require explicit authorized selection", async () => {
  const { port } = fixture();
  port.memberships = async () => ["org-a", "org-b"].map((organizationId) => ({ userId: "user-a", organizationId, role: "owner", status: "active" }));
  await assert.rejects(verifiedReadContext(port, null, true), denied(403));
  assert.equal((await verifiedReadContext(port, "org-b", true)).organizationId, "org-b");
});

for (const organizationId of [null, "org-b"]) {
  test(`foreign/unowned UUID ${organizationId} returns 404 with no child lookup`, async () => {
    const { port, calls, document } = fixture();
    port.document = async () => ({ ...document, organization_id: organizationId });
    const response = await validationReadResponse((id, selected) => readValidation(port, id, selected, true), new Request("http://local/api/documents/x/validation"), docId);
    assert.equal(response.status, 404);
    assert.equal(calls.includes("extractions"), false);
    assert.equal(calls.includes("fields"), false);
  });
}
test("RLS returning no document becomes 404", async () => {
  const { port } = fixture(); port.document = async () => null;
  await assert.rejects(readValidation(port, docId, null, true), denied(404));
});
test("cross-tenant list rows fail closed instead of leaking", async () => {
  const { port } = fixture(); const original = port.documents;
  port.documents = async (org) => (await original(org)).map((row) => ({ ...row, organization_id: "org-b" }));
  await assert.rejects(readDocuments(port, null, true), denied(503));
});
test("foreign extraction relationship fails closed", async () => {
  const { port } = fixture(); const original = port.extractions;
  port.extractions = async (id) => (await original(id)).map((row) => ({ ...row, document_id: "foreign" }));
  await assert.rejects(readValidation(port, docId, null, true), denied(503));
});
test("foreign field relationship fails closed", async () => {
  const { port } = fixture(); port.fields = async () => [{ extraction_id: "foreign" }];
  await assert.rejects(readValidation(port, docId, null, true), denied(503));
});
test("direct read action denies anonymous invocation", async () => {
  const { port } = fixture("owner", "active", null);
  const result = await validationReadAction((id, selected) => readValidation(port, id, selected, true), docId, null);
  assert.deepEqual(result, { success: false, code: "unauthorized" });
});
test("HTTP responses prevent shared caching and hide unexpected errors", async () => {
  const response = await documentsReadResponse(async () => { throw new Error("secret-synthetic"); }, new Request("http://local/api/documents"));
  assert.equal(response.status, 503);
  assert.match(response.headers.get("Cache-Control") ?? "", /no-store/);
  assert.equal((await response.text()).includes("secret-synthetic"), false);
});

test("actual validation server-action facade independently authorizes direct invocation", async () => {
  // Execute the real action module with an injected offline server adapter.
  // The sandbox loader refuses any unexpected dependency, including Next/network.
  for (const user of [null, "user-a"]) {
    const { port } = fixture("owner", "active", user);
    const exports: Record<string, unknown> = {};
    const source = readFileSync(resolve("src/components/validation/validation-data-action.ts"), "utf8");
    const compiled = transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 } }).outputText;
    runInNewContext(compiled, {
      exports,
      require(name: string) {
        if (name === "@/lib/security/read-server") return { getAuthorizedValidation: (id: string, selected: string | null) => readValidation(port, id, selected, true) };
        if (name === "@/lib/security/read-action") return { validationReadAction };
        throw new Error("Unexpected server-action dependency");
      },
    });
    const action = exports.loadValidationData as (id: string) => ReturnType<typeof validationReadAction>;
    const result = await action(docId);
    assert.equal(result.success, !!user);
    if (!result.success) assert.equal(result.code, "unauthorized");
  }
});

test("authorized HTTP list returns 200 with scoped metadata only", async () => {
  const { port } = fixture("reviewer");
  const response = await documentsReadResponse((selected) => readDocuments(port, selected, true), new Request("http://local/api/documents?organizationId=org-a"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.documents[0].id, docId);
  assert.match(response.headers.get("Cache-Control") ?? "", /private, no-store/);
});
