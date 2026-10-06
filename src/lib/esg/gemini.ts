import "server-only";

import { GoogleGenAI } from "@google/genai";

import { EsgExtractionError } from "./errors";
import { logSafeGeminiProviderFailure } from "./gemini-diagnostics";
import { parseGeminiStructuredOutput } from "./gemini-response";
import { createGeminiEsgResponseJsonSchema } from "./gemini-schema";
import { buildEsgDocumentInput, ESG_EXTRACTION_INSTRUCTIONS } from "./prompt";

let geminiClient: GoogleGenAI | undefined;

function getRequiredGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new EsgExtractionError(
      "configuration",
      "The ESG extraction service is not configured.",
      500
    );
  }
  return apiKey;
}

function getGeminiClient() {
  if (geminiClient) return geminiClient;
  geminiClient = new GoogleGenAI({ apiKey: getRequiredGeminiApiKey() });
  return geminiClient;
}

const geminiResponseJsonSchema = createGeminiEsgResponseJsonSchema();

export async function requestGeminiStructuredEsgExtraction(
  documentText: string,
  model: string
) {
  try {
    const response = await getGeminiClient().models.generateContent({
      model,
      contents: buildEsgDocumentInput(documentText),
      config: {
        systemInstruction: ESG_EXTRACTION_INSTRUCTIONS,
        responseMimeType: "application/json",
        responseJsonSchema: geminiResponseJsonSchema,
        maxOutputTokens: 10_000,
        temperature: 0,
        httpOptions: { timeout: 45_000 },
      },
    });

    return parseGeminiStructuredOutput(response.text);
  } catch (error) {
    if (error instanceof EsgExtractionError) throw error;

    logSafeGeminiProviderFailure(error, model);

    throw new EsgExtractionError(
      "provider_failed",
      "The ESG extraction provider could not complete the request.",
      502
    );
  }
}
