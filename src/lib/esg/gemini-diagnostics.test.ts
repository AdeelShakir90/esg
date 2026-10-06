import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "@google/genai";

import {
  createSafeGeminiProviderFailureLog,
  getSafeGeminiErrorDiagnostic,
  isSafeGeminiProviderDiagnosticsEnabled,
  logSafeGeminiProviderFailure,
  sanitizeGeminiErrorMessage,
} from "./gemini-diagnostics";

function captureDiagnosticLog(flag: string | undefined, error: unknown) {
  const originalFlag = process.env.ESG_SAFE_PROVIDER_DIAGNOSTICS;
  const originalConsoleError = console.error;
  const calls: unknown[][] = [];

  if (flag === undefined) {
    delete process.env.ESG_SAFE_PROVIDER_DIAGNOSTICS;
  } else {
    process.env.ESG_SAFE_PROVIDER_DIAGNOSTICS = flag;
  }
  console.error = (...values) => calls.push(values);

  try {
    logSafeGeminiProviderFailure(error, "test-gemini-model");
    return calls;
  } finally {
    console.error = originalConsoleError;
    if (originalFlag === undefined) {
      delete process.env.ESG_SAFE_PROVIDER_DIAGNOSTICS;
    } else {
      process.env.ESG_SAFE_PROVIDER_DIAGNOSTICS = originalFlag;
    }
  }
}

test("extracts only allowlisted Gemini API error metadata", () => {
  const error = Object.assign(
    new ApiError({ status: 429, message: "Provider quota was exhausted." }),
    {
      code: "RESOURCE_EXHAUSTED",
      errorStatus: "RESOURCE_EXHAUSTED",
      responseBody: "must-not-appear",
      headers: { authorization: "must-not-appear" },
    }
  );

  const diagnostic = getSafeGeminiErrorDiagnostic(error, "test-gemini-model");
  assert.deepEqual(diagnostic, {
    errorClass: "ApiError",
    errorName: "ApiError",
    httpStatus: 429,
    providerErrorStatus: "RESOURCE_EXHAUSTED",
    providerErrorCode: "RESOURCE_EXHAUSTED",
    providerMessage: "Provider quota was exhausted.",
    model: "test-gemini-model",
  });
  assert.equal(JSON.stringify(diagnostic).includes("must-not-appear"), false);
});

test("redacts Gemini credentials and request-content references", () => {
  const fakeGeminiKey = "AIza" + "A".repeat(28);

  assert.equal(
    sanitizeGeminiErrorMessage("Authorization: Bearer secret-token-value"),
    "Provider message was redacted because it referenced request content."
  );
  assert.equal(
    sanitizeGeminiErrorMessage(`Invalid key ${fakeGeminiKey}`),
    "Invalid key [redacted]"
  );
  assert.equal(
    sanitizeGeminiErrorMessage("Invalid contents included document_text"),
    "Provider message was redacted because it referenced request content."
  );
  assert.equal(
    sanitizeGeminiErrorMessage("Leaked access token short-value"),
    "Provider message was redacted because it referenced request content."
  );
  assert.equal(
    sanitizeGeminiErrorMessage("Raw response body contained private data"),
    "Provider message was redacted because it referenced request content."
  );
});

test("bounds unknown Gemini errors without serializing arbitrary properties", () => {
  const error = Object.assign(new Error(`Provider failure ${"x".repeat(500)}`), {
    responseBody: "must-not-appear",
  });
  const diagnostic = getSafeGeminiErrorDiagnostic(error, "test-gemini-model");

  assert.equal(diagnostic.httpStatus, null);
  assert.equal(diagnostic.providerErrorStatus, null);
  assert.equal(diagnostic.providerErrorCode, null);
  assert.ok(diagnostic.providerMessage.length <= 240);
  assert.equal(JSON.stringify(diagnostic).includes("must-not-appear"), false);
});

test("enables safe provider diagnostics only for the exact value true", () => {
  assert.equal(isSafeGeminiProviderDiagnosticsEnabled(undefined), false);
  assert.equal(isSafeGeminiProviderDiagnosticsEnabled("false"), false);
  assert.equal(isSafeGeminiProviderDiagnosticsEnabled("TRUE"), false);
  assert.equal(isSafeGeminiProviderDiagnosticsEnabled(" true "), false);
  assert.equal(isSafeGeminiProviderDiagnosticsEnabled("true"), true);
});

test("does not log when diagnostics are absent or not exactly enabled", () => {
  const error = new Error("Safe provider failure.");

  assert.equal(captureDiagnosticLog(undefined, error).length, 0);
  assert.equal(captureDiagnosticLog("false", error).length, 0);
  assert.equal(captureDiagnosticLog("TRUE", error).length, 0);
});

test("logs one structured allowlisted record when explicitly enabled", () => {
  const error = Object.assign(
    new ApiError({ status: 503, message: "The model is temporarily unavailable." }),
    {
      code: "UNAVAILABLE",
      errorStatus: "UNAVAILABLE",
      apiKey: "must-not-appear-api-key",
      accessToken: "must-not-appear-access-token",
      authorization: "must-not-appear-authorization",
      documentText: "must-not-appear-document-text",
      prompt: "must-not-appear-prompt",
      rawResponse: "must-not-appear-raw-response",
      responseBody: "must-not-appear-response-body",
    }
  );

  const calls = captureDiagnosticLog("true", error);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].length, 1);
  assert.deepEqual(calls[0][0], {
    event: "gemini_provider_failure",
    provider: "gemini",
    model: "test-gemini-model",
    errorClass: "ApiError",
    errorName: "ApiError",
    httpStatus: 503,
    providerStatus: "UNAVAILABLE",
    providerCode: "UNAVAILABLE",
    providerMessage: "The model is temporarily unavailable.",
  });

  const serializedLog = JSON.stringify(calls);
  for (const forbidden of [
    "must-not-appear",
    "apiKey",
    "accessToken",
    "authorization",
    "documentText",
    "prompt",
    "rawResponse",
    "responseBody",
  ]) {
    assert.equal(serializedLog.includes(forbidden), false);
  }
});

test("omits unavailable provider metadata from the log record", () => {
  assert.deepEqual(
    createSafeGeminiProviderFailureLog(
      new Error("A safe provider failure occurred."),
      "test-gemini-model"
    ),
    {
      event: "gemini_provider_failure",
      provider: "gemini",
      model: "test-gemini-model",
      errorClass: "Error",
      errorName: "Error",
      providerMessage: "A safe provider failure occurred.",
    }
  );
});
