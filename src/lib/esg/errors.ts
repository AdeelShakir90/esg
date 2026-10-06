export type EsgExtractionErrorCode =
  | "configuration"
  | "source_too_large"
  | "provider_failed"
  | "invalid_output"
  | "evidence_failed";

export class EsgExtractionError extends Error {
  constructor(
    readonly code: EsgExtractionErrorCode,
    readonly publicMessage: string,
    readonly httpStatus: number
  ) {
    super(publicMessage);
    this.name = "EsgExtractionError";
  }
}
