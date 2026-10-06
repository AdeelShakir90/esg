import { MAX_ESG_SOURCE_TEXT_CHARACTERS } from "./definitions";
import { EsgExtractionError } from "./errors";
import { verifyEsgEvidence } from "./evidence";
import {
  getEsgAiProviderConfig,
  requestEsgAiProvider,
  type EsgAiProviderConfig,
  type EsgAiProviderRequest,
  type ValidatedEsgAiProviderResult,
} from "./provider";
import { validateEsgExtractionOutput } from "./schema";

export function getEsgExtractionProvider() {
  return getEsgAiProviderConfig();
}

export async function extractStructuredEsgData(
  extractedText: string,
  config: EsgAiProviderConfig,
  requestProvider: EsgAiProviderRequest = requestEsgAiProvider
): Promise<ValidatedEsgAiProviderResult> {
  const sourceText = extractedText.trim();

  if (sourceText.length > MAX_ESG_SOURCE_TEXT_CHARACTERS) {
    throw new EsgExtractionError(
      "source_too_large",
      "The document text exceeds the current ESG extraction limit.",
      413
    );
  }

  const providerOutput = await requestProvider(sourceText, config);
  const extraction = validateEsgExtractionOutput(providerOutput.result);
  verifyEsgEvidence(sourceText, extraction.fields);
  return { ...config, result: extraction };
}
