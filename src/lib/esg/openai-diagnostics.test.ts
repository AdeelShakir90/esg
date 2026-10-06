import assert from "node:assert/strict";
import test from "node:test";
import OpenAI from "openai";

import {
  getSafeOpenAiErrorDiagnostic,
  sanitizeOpenAiErrorMessage,
} from "./openai-diagnostics";

test("extracts only allowlisted OpenAI API error metadata", () => {
  const headers = new Headers({ "x-request-id": "req_safe123" });
  const error = OpenAI.APIError.generate(
    400,
    {
      error: {
        message: "The response format schema is invalid.",
        type: "invalid_request_error",
        code: "invalid_json_schema",
      },
    },
    undefined,
    headers
  );

  assert.deepEqual(getSafeOpenAiErrorDiagnostic(error, "gpt-5-mini"), {
    errorClass: "BadRequestError",
    errorName: "Error",
    httpStatus: 400,
    providerErrorType: "invalid_request_error",
    providerErrorCode: "invalid_json_schema",
    requestId: "req_safe123",
    providerMessage: "400 The response format schema is invalid.",
    model: "gpt-5-mini",
  });
});

test("redacts credentials and request-content references from provider messages", () => {
  assert.equal(
    sanitizeOpenAiErrorMessage("Authorization: Bearer secret-token-value"),
    "Provider message was redacted because it referenced request content."
  );
  assert.equal(
    sanitizeOpenAiErrorMessage("Invalid credential sk-example-secret-value"),
    "Invalid credential [redacted]"
  );
  assert.equal(
    sanitizeOpenAiErrorMessage("Invalid input document_text contained instructions"),
    "Provider message was redacted because it referenced request content."
  );
});

test("bounds unknown error messages and does not expose arbitrary properties", () => {
  const error = Object.assign(new Error(`Provider failure ${"x".repeat(500)}`), {
    headers: { authorization: "Bearer must-not-appear" },
    responseBody: "must-not-appear",
  });
  const diagnostic = getSafeOpenAiErrorDiagnostic(error, "gpt-5-mini");

  assert.equal(diagnostic.httpStatus, null);
  assert.equal(diagnostic.providerErrorType, null);
  assert.equal(diagnostic.providerErrorCode, null);
  assert.equal(diagnostic.requestId, null);
  assert.ok(diagnostic.providerMessage.length <= 240);
  assert.equal(JSON.stringify(diagnostic).includes("must-not-appear"), false);
});
