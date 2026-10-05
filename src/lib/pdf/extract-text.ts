import "server-only";

import { extractText, getDocumentProxy, getResolvedPDFJS } from "unpdf";

const MAX_PDF_PAGES = 250;
const PDF_HEADER_SCAN_BYTES = 1024;

export type PdfTextExtractionResult =
  | {
      status: "completed";
      text: string;
      pageCount: number;
      parserVersion: string;
    }
  | {
      status: "no_text";
      text: null;
      pageCount: number;
      parserVersion: string;
    };

export class PdfTextExtractionError extends Error {
  constructor(
    message: string,
    readonly code: "invalid_pdf" | "too_many_pages" | "parse_failed"
  ) {
    super(message);
    this.name = "PdfTextExtractionError";
  }
}

function hasPdfMagic(bytes: Uint8Array) {
  const header = new TextDecoder("latin1").decode(
    bytes.subarray(0, Math.min(bytes.length, PDF_HEADER_SCAN_BYTES))
  );
  return header.includes("%PDF-");
}

function normalizeExtractedText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractPdfText(
  bytes: Uint8Array
): Promise<PdfTextExtractionResult> {
  if (bytes.length === 0 || !hasPdfMagic(bytes)) {
    throw new PdfTextExtractionError(
      "The stored file does not contain a valid PDF header.",
      "invalid_pdf"
    );
  }

  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | undefined;

  try {
    pdf = await getDocumentProxy(bytes);

    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new PdfTextExtractionError(
        `PDFs with more than ${MAX_PDF_PAGES} pages are not supported.`,
        "too_many_pages"
      );
    }

    const [{ text, totalPages }, pdfjs] = await Promise.all([
      extractText(pdf, { mergePages: true }),
      getResolvedPDFJS(),
    ]);
    const normalizedText = normalizeExtractedText(text);
    const parserVersion = `unpdf/pdfjs@${pdfjs.version ?? "unknown"}`;

    if (normalizedText.length === 0) {
      return {
        status: "no_text",
        text: null,
        pageCount: totalPages,
        parserVersion,
      };
    }

    return {
      status: "completed",
      text: normalizedText,
      pageCount: totalPages,
      parserVersion,
    };
  } catch (error) {
    if (error instanceof PdfTextExtractionError) throw error;

    throw new PdfTextExtractionError(
      "The PDF could not be parsed as a text-based document.",
      "parse_failed"
    );
  } finally {
    await pdf?.cleanup();
  }
}
