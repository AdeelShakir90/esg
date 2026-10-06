import type { ExtractedEsgField } from "./schema";
import { EsgExtractionError } from "./errors";

const MIN_EVIDENCE_TOKENS = 3;

export function normalizeEvidenceText(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}%]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function isEvidenceGrounded(sourceText: string, quote: string) {
  const normalizedSource = normalizeEvidenceText(sourceText);
  const normalizedQuote = normalizeEvidenceText(quote);

  if (normalizedQuote.split(" ").filter(Boolean).length < MIN_EVIDENCE_TOKENS) {
    return false;
  }

  return normalizedSource.includes(normalizedQuote);
}

export function verifyEsgEvidence(
  sourceText: string,
  fields: readonly ExtractedEsgField[]
) {
  for (const field of fields) {
    if (field.status !== "found") continue;

    if (!field.evidence.quote || !isEvidenceGrounded(sourceText, field.evidence.quote)) {
      throw new EsgExtractionError(
        "evidence_failed",
        "The ESG extraction contained evidence that could not be verified.",
        502
      );
    }
  }
}
