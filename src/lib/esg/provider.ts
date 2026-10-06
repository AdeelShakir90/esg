import type { EsgExtractionOutput } from "./schema";
import { EsgExtractionError } from "./errors";

export type EsgAiProviderName = "openai" | "gemini";

export type EsgAiProviderConfig = {
  provider: EsgAiProviderName;
  model: string;
};

export type EsgAiProviderResult = EsgAiProviderConfig & {
  result: unknown;
};

export type EsgAiProviderRequest = (
  documentText: string,
  config: EsgAiProviderConfig
) => Promise<EsgAiProviderResult>;

type ProviderEnvironment = {
  [name: string]: string | undefined;
};

function configurationError(): never {
  throw new EsgExtractionError(
    "configuration",
    "The ESG extraction service is not configured.",
    500
  );
}

function required(environment: ProviderEnvironment, name: keyof ProviderEnvironment) {
  const value = environment[name]?.trim();
  if (!value) configurationError();
  return value;
}

export function getEsgAiProviderConfig(
  environment: ProviderEnvironment = process.env
): EsgAiProviderConfig {
  const provider = required(environment, "ESG_AI_PROVIDER");

  if (provider === "openai") {
    required(environment, "OPENAI_API_KEY");
    return { provider, model: required(environment, "OPENAI_MODEL") };
  }

  if (provider === "gemini") {
    required(environment, "GEMINI_API_KEY");
    return { provider, model: required(environment, "GEMINI_MODEL") };
  }

  return configurationError();
}

const defaultProviderImplementations: Record<
  EsgAiProviderName,
  (documentText: string, model: string) => Promise<unknown>
> = {
  openai: async (documentText, model) => {
    const { requestOpenAiStructuredEsgExtraction } = await import("./openai");
    return requestOpenAiStructuredEsgExtraction(documentText, model);
  },
  gemini: async (documentText, model) => {
    const { requestGeminiStructuredEsgExtraction } = await import("./gemini");
    return requestGeminiStructuredEsgExtraction(documentText, model);
  },
};

export function createEsgAiProviderRequest(
  implementations = defaultProviderImplementations
): EsgAiProviderRequest {
  return async (documentText, config) => ({
    ...config,
    result: await implementations[config.provider](documentText, config.model),
  });
}

export const requestEsgAiProvider = createEsgAiProviderRequest();

export type ValidatedEsgAiProviderResult = EsgAiProviderConfig & {
  result: EsgExtractionOutput;
};
