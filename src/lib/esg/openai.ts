import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { EsgExtractionError } from "./errors";
import { logOpenAiErrorForDevelopment } from "./openai-diagnostics";
import { buildEsgDocumentInput, ESG_EXTRACTION_INSTRUCTIONS } from "./prompt";
import { EsgExtractionOutputSchema } from "./schema";

let openaiClient: OpenAI | undefined;

function getRequiredEnvironmentVariable(name: "OPENAI_API_KEY" | "OPENAI_MODEL") {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new EsgExtractionError(
      "configuration",
      "The ESG extraction service is not configured.",
      500
    );
  }
  return value;
}

function getOpenAiClient() {
  if (openaiClient) return openaiClient;

  openaiClient = new OpenAI({
    apiKey: getRequiredEnvironmentVariable("OPENAI_API_KEY"),
    timeout: 45_000,
    maxRetries: 1,
  });
  return openaiClient;
}

export async function requestOpenAiStructuredEsgExtraction(
  documentText: string,
  model: string
) {
  try {
    const response = await getOpenAiClient().responses.parse({
      model,
      instructions: ESG_EXTRACTION_INSTRUCTIONS,
      input: buildEsgDocumentInput(documentText),
      text: {
        format: zodTextFormat(EsgExtractionOutputSchema, "envario_esg_extraction"),
      },
      max_output_tokens: 10_000,
      store: false,
    });

    if (!response.output_parsed) {
      throw new EsgExtractionError(
        "invalid_output",
        "The ESG extraction service returned no structured result.",
        502
      );
    }

    return response.output_parsed;
  } catch (error) {
    if (error instanceof EsgExtractionError) throw error;

    logOpenAiErrorForDevelopment(error, model);

    throw new EsgExtractionError(
      "provider_failed",
      "The ESG extraction provider could not complete the request.",
      502
    );
  }
}
