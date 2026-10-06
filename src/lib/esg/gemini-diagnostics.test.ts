import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "@google/genai";

import {
  getSafeGeminiErrorDiagnostic,
  sanitizeGeminiErrorMessage,
} from "./gemini-diagnostics";

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
  assert.equal(
    sanitizeGeminiErrorMessage("Authorization: Bearer secret-token-value"),
    "Provider message was redacted because it referenced request content."
  );
  assert.equal(
    sanitizeGeminiErrorMessage("Invalid key AIzaExampleSecretCredential"),
    "Invalid key [redacted]"
  );
  assert.equal(
    sanitizeGeminiErrorMessage("Invalid contents included document_text"),
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
