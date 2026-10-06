import assert from "node:assert/strict";
import test from "node:test";

import { ESG_FIELD_DEFINITIONS } from "./definitions";
import { EsgExtractionError } from "./errors";
import { extractStructuredEsgData } from "./extract";
import {
  createEsgAiProviderRequest,
  getEsgAiProviderConfig,
  type EsgAiProviderName,
} from "./provider";

function notFoundOutput() {
  return {
    fields: ESG_FIELD_DEFINITIONS.map((definition) => ({
      key: definition.key,
      label: definition.label,
      category: definition.category,
      status: "not_found" as const,
      value: null,
      unit: null,
      reporting_period: { label: null, start: null, end: null },
      confidence: null,
      evidence: { quote: null, page: null },
    })),
  };
}

function assertConfigurationError(callback: () => unknown) {
  assert.throws(callback, (error) => {
    assert.ok(error instanceof EsgExtractionError);
    assert.equal(error.code, "configuration");
    assert.equal(error.publicMessage, "The ESG extraction service is not configured.");
    return true;
  });
}

test("selects OpenAI only when configured", () => {
  assert.deepEqual(
    getEsgAiProviderConfig({
      ESG_AI_PROVIDER: "openai",
      OPENAI_API_KEY: "test-openai-key",
      OPENAI_MODEL: "test-openai-model",
    }),
    { provider: "openai", model: "test-openai-model" }
  );
});

test("selects Gemini only when configured", () => {
  assert.deepEqual(
    getEsgAiProviderConfig({
      ESG_AI_PROVIDER: "gemini",
      GEMINI_API_KEY: "test-gemini-key",
      GEMINI_MODEL: "test-gemini-model",
    }),
    { provider: "gemini", model: "test-gemini-model" }
  );
});

test("rejects missing or invalid provider configuration", () => {
  assertConfigurationError(() => getEsgAiProviderConfig({}));
  assertConfigurationError(() =>
    getEsgAiProviderConfig({ ESG_AI_PROVIDER: "unsupported" })
  );
});

test("rejects missing Gemini key or model", () => {
  assertConfigurationError(() =>
    getEsgAiProviderConfig({
      ESG_AI_PROVIDER: "gemini",
      GEMINI_MODEL: "test-gemini-model",
    })
  );
  assertConfigurationError(() =>
    getEsgAiProviderConfig({
      ESG_AI_PROVIDER: "gemini",
      GEMINI_API_KEY: "test-gemini-key",
    })
  );
});

test("routes OpenAI and Gemini through their respective mocked adapters", async () => {
  const calls: EsgAiProviderName[] = [];
  const output = notFoundOutput();
  const request = createEsgAiProviderRequest({
    openai: async () => {
      calls.push("openai");
      return output;
    },
    gemini: async () => {
      calls.push("gemini");
      return output;
    },
  });

  await request("document", { provider: "openai", model: "openai-model" });
  await request("document", { provider: "gemini", model: "gemini-model" });
  assert.deepEqual(calls, ["openai", "gemini"]);
});

test("applies shared Zod validation after either provider", async () => {
  const output = notFoundOutput();
  const request = createEsgAiProviderRequest({
    openai: async () => output,
    gemini: async () => output,
  });

  const extraction = await extractStructuredEsgData(
    "Document with no supported ESG values.",
    { provider: "gemini", model: "gemini-model" },
    request
  );
  assert.equal(extraction.result.fields.length, 12);

  const malformedRequest = createEsgAiProviderRequest({
    openai: async () => ({ fields: [] }),
    gemini: async () => ({ fields: [] }),
  });
  await assert.rejects(() =>
    extractStructuredEsgData(
      "Document with no supported ESG values.",
      { provider: "gemini", model: "gemini-model" },
      malformedRequest
    )
  );
});

test("keeps evidence verification provider-independent", async () => {
  const output = notFoundOutput();
  output.fields[0] = {
    ...output.fields[0],
    status: "found",
    value: { type: "number", value: 1240 },
    unit: "MWh",
    confidence: 0.95,
    evidence: { quote: "Electricity consumption was 1,240 MWh", page: null },
  } as never;
  const request = createEsgAiProviderRequest({
    openai: async () => output,
    gemini: async () => output,
  });

  await assert.rejects(() =>
    extractStructuredEsgData(
      "This source does not contain that evidence.",
      { provider: "openai", model: "openai-model" },
      request
    )
  );
});
