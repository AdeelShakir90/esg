export const PDF_UNSUPPORTED_TEXT_NOTICE =
  "PDF export supports Latin, Greek, Cyrillic, German characters, common currency signs, and selected mathematical symbols. Unsupported scripts and emoji are shown as the replacement character.";

export type PdfTextRun = {
  text: string;
  fontFamily: "Noto Sans" | "Noto Sans Math";
};

const REPLACEMENT_CHARACTER = "\uFFFD";
const MATH_FONT_CODE_POINTS = new Set([0x2192, 0x2264, 0x2265, 0x2713]);

function isNotoSansCodePoint(codePoint: number) {
  return (
    codePoint === 0x0009 ||
    codePoint === 0x000a ||
    codePoint === 0x000d ||
    (codePoint >= 0x0020 && codePoint <= 0x007e) ||
    (codePoint >= 0x00a0 && codePoint <= 0x024f) ||
    (codePoint >= 0x0300 && codePoint <= 0x036f) ||
    (codePoint >= 0x0370 && codePoint <= 0x052f) ||
    (codePoint >= 0x1e00 && codePoint <= 0x1eff) ||
    (codePoint >= 0x2000 && codePoint <= 0x206f) ||
    (codePoint >= 0x2070 && codePoint <= 0x209f) ||
    (codePoint >= 0x20a0 && codePoint <= 0x20cf) ||
    codePoint === 0xfffd
  );
}

export function sanitizePdfText(value: string) {
  return Array.from(value, (character) => {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) return REPLACEMENT_CHARACTER;
    if (MATH_FONT_CODE_POINTS.has(codePoint) || isNotoSansCodePoint(codePoint)) {
      return character;
    }
    return REPLACEMENT_CHARACTER;
  }).join("");
}

export function splitPdfTextRuns(value: string): PdfTextRun[] {
  const runs: PdfTextRun[] = [];

  for (const character of sanitizePdfText(value)) {
    const codePoint = character.codePointAt(0) ?? 0xfffd;
    const fontFamily = MATH_FONT_CODE_POINTS.has(codePoint)
      ? "Noto Sans Math"
      : "Noto Sans";
    const previous = runs.at(-1);

    if (previous?.fontFamily === fontFamily) {
      previous.text += character;
    } else {
      runs.push({ text: character, fontFamily });
    }
  }

  return runs;
}
