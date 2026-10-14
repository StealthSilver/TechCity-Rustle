import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import {
  offerLetterBlocks,
  offerLetterFileName,
  type OfferLetterValues,
  type TextRun,
  type TextWeight,
} from "@/lib/offer-letter";

const TEMPLATE_URL = "/Offer-Letter/Offer%20Letter-%20Sameer%20(MMU).pdf";
const LEFT = 18.1;
const TEXT_WIDTH = 545;
const FONT_SIZE = 11.72;
const LEADING = 16.5;
const FIRST_BASELINE = 673;
const LOWEST_BASELINE = 228;

const ink = rgb(0.08, 0.08, 0.08);

type Fonts = Record<TextWeight, PDFFont>;

let assetsPromise: Promise<{
  template: ArrayBuffer;
  regular: ArrayBuffer;
  bold: ArrayBuffer;
  noto: ArrayBuffer;
  watermark: ArrayBuffer;
}> | null = null;

function loadAssets() {
  if (!assetsPromise) {
    assetsPromise = Promise.all([
      fetch(TEMPLATE_URL).then((response) => response.arrayBuffer()),
      fetch("/fonts/OpenSauceOne-Regular.ttf").then((response) => response.arrayBuffer()),
      fetch("/fonts/OpenSauceOne-Bold.ttf").then((response) => response.arrayBuffer()),
      fetch("/fonts/NotoSans-Bold.ttf").then((response) => response.arrayBuffer()),
      fetch("/offer-letter-watermark.png").then((response) => response.arrayBuffer()),
    ]).then(([template, regular, bold, noto, watermark]) => ({
      template,
      regular,
      bold,
      noto,
      watermark,
    }));
  }
  return assetsPromise;
}

function measure(run: TextRun, fonts: Fonts) {
  return fonts[run.weight].widthOfTextAtSize(run.text, FONT_SIZE);
}

function wrapBlock(runs: TextRun[], fonts: Fonts) {
  const tokens: TextRun[] = [];
  for (const run of runs) {
    const parts = run.text.split(/(\s+)/).filter((part) => part.length > 0);
    for (const part of parts) {
      tokens.push({ text: part, weight: run.weight });
    }
  }

  const lines: TextRun[][] = [];
  let current: TextRun[] = [];
  let width = 0;

  const pushLine = () => {
    while (current.length > 0 && current[0].text.trim() === "") current.shift();
    while (current.length > 0 && current[current.length - 1].text.trim() === "") {
      current.pop();
    }
    if (current.length > 0) lines.push(current);
    current = [];
    width = 0;
  };

  for (const token of tokens) {
    const tokenWidth = measure(token, fonts);
    const isSpace = token.text.trim() === "";
    if (!isSpace && width + tokenWidth > TEXT_WIDTH && width > 0) {
      pushLine();
    }
    if (isSpace && current.length === 0) continue;
    current.push(token);
    width += tokenWidth;
  }
  pushLine();
  return lines;
}

export async function fillOfferLetterPdf(
  template: ArrayBuffer | Uint8Array,
  fontBytes: {
    regular: ArrayBuffer | Uint8Array;
    bold: ArrayBuffer | Uint8Array;
    noto: ArrayBuffer | Uint8Array;
  },
  values: OfferLetterValues,
  watermark?: ArrayBuffer | Uint8Array,
) {
  const pdf = await PDFDocument.load(template);
  pdf.registerFontkit(fontkit);
  const page = pdf.getPages()[0];
  const fonts: Fonts = {
    regular: await pdf.embedFont(fontBytes.regular),
    bold: await pdf.embedFont(fontBytes.bold),
    rupee: await pdf.embedFont(fontBytes.noto),
  };

  page.drawRectangle({
    x: 14,
    y: LOWEST_BASELINE - 4,
    width: 568,
    height: FIRST_BASELINE + 12 - (LOWEST_BASELINE - 4),
    color: rgb(1, 1, 1),
  });

  if (watermark) {
    const image = await pdf.embedPng(watermark);
    page.drawImage(image, {
      x: 113,
      y: 268,
      width: 370,
      height: 370,
      opacity: 0.11,
    });
  }

  let baseline = FIRST_BASELINE;
  for (const block of offerLetterBlocks(values)) {
    const lines = wrapBlock(block.runs, fonts);
    for (const line of lines) {
      let x = LEFT;
      for (const run of line) {
        page.drawText(run.text, {
          x,
          y: baseline,
          size: FONT_SIZE,
          font: fonts[run.weight],
          color: ink,
        });
        x += measure(run, fonts);
      }
      baseline -= LEADING;
    }
    if (block.spaceAfter) baseline -= LEADING;
  }

  return pdf.save();
}

export async function buildOfferLetterPdf(values: OfferLetterValues) {
  const assets = await loadAssets();
  return fillOfferLetterPdf(assets.template, assets, values, assets.watermark);
}

export async function downloadOfferLetterPdf(values: OfferLetterValues) {
  const bytes = await buildOfferLetterPdf(values);
  const blob = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = offerLetterFileName(values.candidateName);
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
