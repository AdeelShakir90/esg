import { Font } from "@react-pdf/renderer";

const DEFAULT_FONT_BASE_URL = "/fonts/noto-sans";
const registeredFontSources = new Set<string>();

export function registerEsgPdfFonts(fontBaseUrl = DEFAULT_FONT_BASE_URL) {
  const normalizedBaseUrl = fontBaseUrl.replace(/\/$/, "");
  if (registeredFontSources.has(normalizedBaseUrl)) return;

  Font.register({
    family: "Noto Sans",
    fonts: [
      {
        src: `${normalizedBaseUrl}/NotoSans-Regular.ttf`,
        fontWeight: 400,
      },
      {
        src: `${normalizedBaseUrl}/NotoSans-Bold.ttf`,
        fontWeight: 700,
      },
    ],
  });
  Font.register({
    family: "Noto Sans Math",
    src: `${normalizedBaseUrl}/NotoSansMath-Regular.ttf`,
    fontWeight: 400,
  });
  Font.registerHyphenationCallback((word) => [word]);

  registeredFontSources.add(normalizedBaseUrl);
}
