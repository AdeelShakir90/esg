import assert from "node:assert/strict";
import test from "node:test";

import {
  sanitizePdfText,
  splitPdfTextRuns,
} from "./report-pdf-text";

test("preserves supported German, currency, subscript, and mathematical text", () => {
  const value = "Ärger, Öl, Übung, Straße · € £ ¥ ₽ · CO₂e · ± ≤ ≥ → ✓";

  assert.equal(sanitizePdfText(value), value);
  assert.equal(
    splitPdfTextRuns(value).map((run) => run.text).join(""),
    value
  );
  assert.deepEqual(
    splitPdfTextRuns("A ≤ B").map((run) => run.fontFamily),
    ["Noto Sans", "Noto Sans Math", "Noto Sans"]
  );
});

test("replaces unsupported scripts and emoji visibly", () => {
  assert.equal(sanitizePdfText("😀 漢字 العربية"), "� �� �������");
});
