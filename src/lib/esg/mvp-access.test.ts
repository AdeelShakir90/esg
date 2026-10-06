import assert from "node:assert/strict";
import test from "node:test";

import { withMvpApiAccess } from "./mvp-access";

const configuredToken = "controlled-mvp-test-token";

function request(token?: string) {
  return new Request("http://localhost/api/documents/test/esg-extraction", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

async function responseBody(response: Response) {
  return response.text();
}

test("rejects missing and incorrect access tokens before protected work", async () => {
  for (const candidate of [undefined, "incorrect-token"]) {
    let protectedWorkCount = 0;
    const response = await withMvpApiAccess(
      request(candidate),
      configuredToken,
      () => {
        protectedWorkCount += 1;
        return Response.json({ reached: true });
      }
    );

    assert.equal(response.status, 401);
    assert.equal(protectedWorkCount, 0);
    const body = await responseBody(response);
    assert.equal(body.includes(configuredToken), false);
    if (candidate) assert.equal(body.includes(candidate), false);
  }
});

test("fails closed when the server access token is not configured", async () => {
  let protectedWorkCount = 0;
  const response = await withMvpApiAccess(
    request(configuredToken),
    undefined,
    () => {
      protectedWorkCount += 1;
      return Response.json({ reached: true });
    }
  );

  assert.equal(response.status, 401);
  assert.equal(protectedWorkCount, 0);
  assert.equal((await responseBody(response)).includes(configuredToken), false);
});

test("allows a correct token to reach the unchanged protected handler", async () => {
  let protectedWorkCount = 0;
  const response = await withMvpApiAccess(
    request(configuredToken),
    configuredToken,
    () => {
      protectedWorkCount += 1;
      return Response.json({ extraction: { status: "completed" } });
    }
  );

  assert.equal(response.status, 200);
  assert.equal(protectedWorkCount, 1);
  const body = await response.text();
  assert.equal(body.includes(configuredToken), false);
  assert.deepEqual(JSON.parse(body), {
    extraction: { status: "completed" },
  });
});

test("does not log access tokens for unauthorized requests", async () => {
  const originalError = console.error;
  const originalLog = console.log;
  const originalWarn = console.warn;
  const logged: unknown[] = [];

  console.error = (...values) => logged.push(...values);
  console.log = (...values) => logged.push(...values);
  console.warn = (...values) => logged.push(...values);

  try {
    await withMvpApiAccess(
      request("incorrect-secret-token"),
      configuredToken,
      () => Response.json({ reached: true })
    );
  } finally {
    console.error = originalError;
    console.log = originalLog;
    console.warn = originalWarn;
  }

  assert.deepEqual(logged, []);
});
