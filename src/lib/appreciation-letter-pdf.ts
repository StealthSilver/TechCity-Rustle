import fontkit from "@pdf-lib/fontkit";
import {
  decodePDFRawStream,
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFRef,
  rgb,
  type PDFFont,
  type PDFObject,
} from "pdf-lib";
import { formatOfferDate } from "@/lib/offer-letter";
import {
  appreciationLetterBlocks,
  appreciationLetterFileName,
  type AppreciationLetterValues,
  type LetterBlock,
  type LetterInk,
  type TextRun,
  type TextWeight,
} from "@/lib/appreciation-letter";

const TEMPLATE_URL = "/Appreciation-Letter/Appreciation-Letter.pdf";
const LEFT = 50;
const TEXT_WIDTH = 495.2756;
const DATE_RIGHT = 545.2756;
const DATE_BASELINE = 641.8898;
const DATE_SIZE = 9.5;
const BODY_LEADING = 15.6;
const PARAGRAPH_GAP = 9;
const FIRST_BASELINE = 602.0898;
const TEMPLATE_LETTER_TEXT_OBJECTS = 11;

const navy = rgb(0.047059, 0.086275, 0.160784);
const slate = rgb(0.164706, 0.188235, 0.258824);
const dateInk = rgb(0.419608, 0.45098, 0.521569);

const inks: Record<LetterInk, ReturnType<typeof rgb>> = { navy, slate };

type Fonts = Record<TextWeight, PDFFont>;

const keptText = [
  "(+91 94121 13232)",
  "(Noida, Uttar Pradesh)",
  "(techcityskillspvt.ltd@gmail.com)",
  "(Letter of Appreciation)",
  "(Signature:)",
];

const closingLines: Array<{
  runs: TextRun[];
  y: number;
  ink: LetterInk;
}> = [
  { runs: [{ text: "Sincerely,", weight: "light" }], y: 350.8898, ink: "slate" },
  {
    runs: [
      { text: "For ", weight: "light" },
      { text: "TechCity Skills Pvt. Ltd.", weight: "bold" },
    ],
    y: 334.2898,
    ink: "slate",
  },
  { runs: [{ text: "Gunjan Soam", weight: "bold" }], y: 317.6898, ink: "navy" },
  { runs: [{ text: "Director", weight: "medium" }], y: 301.0898, ink: "slate" },
];

let assetsPromise: Promise<{
  template: ArrayBuffer;
  light: ArrayBuffer;
  medium: ArrayBuffer;
  bold: ArrayBuffer;
}> | null = null;

function loadAssets() {
  if (!assetsPromise) {
    assetsPromise = Promise.all([
      fetch(TEMPLATE_URL).then((response) => response.arrayBuffer()),
      fetch("/fonts/Poppins-Light.ttf").then((response) => response.arrayBuffer()),
      fetch("/fonts/Poppins-Medium.ttf").then((response) => response.arrayBuffer()),
      fetch("/fonts/Poppins-Bold.ttf").then((response) => response.arrayBuffer()),
    ]).then(([template, light, medium, bold]) => ({ template, light, medium, bold }));
  }
  return assetsPromise;
}

function measure(run: TextRun, fonts: Fonts, size: number) {
  return fonts[run.weight].widthOfTextAtSize(run.text, size);
}

function wrapBlock(block: LetterBlock, fonts: Fonts) {
  const tokens: TextRun[] = [];
  for (const run of block.runs) {
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
    const tokenWidth = measure(token, fonts, block.size);
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

function isWhitespaceByte(byte: number) {
  return byte === 0 || byte === 9 || byte === 10 || byte === 12 || byte === 13 || byte === 32;
}

function isDelimiterByte(byte: number) {
  return (
    byte === 0x28 ||
    byte === 0x29 ||
    byte === 0x3c ||
    byte === 0x3e ||
    byte === 0x5b ||
    byte === 0x5d ||
    byte === 0x7b ||
    byte === 0x7d ||
    byte === 0x2f ||
    byte === 0x25
  );
}

function skipWhitespaceAndComments(bytes: Uint8Array, index: number) {
  let cursor = index;
  while (cursor < bytes.length) {
    if (isWhitespaceByte(bytes[cursor])) {
      cursor += 1;
      continue;
    }
    if (bytes[cursor] === 0x25) {
      cursor += 1;
      while (cursor < bytes.length && bytes[cursor] !== 10 && bytes[cursor] !== 13) cursor += 1;
      continue;
    }
    break;
  }
  return cursor;
}

function skipLiteralString(bytes: Uint8Array, start: number) {
  let depth = 1;
  let cursor = start + 1;
  while (cursor < bytes.length && depth > 0) {
    if (bytes[cursor] === 0x5c) {
      cursor += cursor + 1 < bytes.length ? 2 : 1;
      continue;
    }
    if (bytes[cursor] === 0x28) depth += 1;
    else if (bytes[cursor] === 0x29) depth -= 1;
    cursor += 1;
  }
  return cursor;
}

type ContentToken = { end: number; kind: "name" | "keyword" | "other"; value: string };

function latin1(bytes: Uint8Array, start: number, end: number) {
  let text = "";
  for (let index = start; index < end; index += 1) text += String.fromCharCode(bytes[index]);
  return text;
}

function readToken(bytes: Uint8Array, start: number): ContentToken {
  if (start >= bytes.length) return { end: start, kind: "other", value: "" };
  const byte = bytes[start];
  if (byte === 0x28) return { end: skipLiteralString(bytes, start), kind: "other", value: "" };
  if (byte === 0x3c) {
    if (bytes[start + 1] === 0x3c) return { end: start + 2, kind: "other", value: "<<" };
    let cursor = start + 1;
    while (cursor < bytes.length && bytes[cursor] !== 0x3e) cursor += 1;
    return { end: Math.min(cursor + 1, bytes.length), kind: "other", value: "" };
  }
  if (byte === 0x3e && bytes[start + 1] === 0x3e) {
    return { end: start + 2, kind: "other", value: ">>" };
  }
  if (byte === 0x2f) {
    let cursor = start + 1;
    while (
      cursor < bytes.length &&
      !isWhitespaceByte(bytes[cursor]) &&
      !isDelimiterByte(bytes[cursor])
    ) {
      cursor += 1;
    }
    return { end: cursor, kind: "name", value: latin1(bytes, start, cursor) };
  }
  if (isDelimiterByte(byte)) {
    return { end: start + 1, kind: "other", value: String.fromCharCode(byte) };
  }

  let cursor = start + 1;
  while (cursor < bytes.length && !isWhitespaceByte(bytes[cursor]) && !isDelimiterByte(bytes[cursor])) {
    cursor += 1;
  }
  const value = latin1(bytes, start, cursor);
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value)) return { end: cursor, kind: "other", value };
  return { end: cursor, kind: "keyword", value };
}

function endOfTextObject(bytes: Uint8Array, start: number, limit: number) {
  let cursor = start;
  while (cursor < limit) {
    cursor = skipWhitespaceAndComments(bytes, cursor);
    if (cursor >= limit) break;
    const token = readToken(bytes, cursor);
    if (token.kind === "keyword" && token.value === "ET") return token.end;
    cursor = token.end;
  }
  throw new Error("Appreciation letter template text could not be removed.");
}

function withoutRanges(bytes: Uint8Array, ranges: Array<[number, number]>) {
  let removed = 0;
  for (const [start, end] of ranges) removed += end - start;
  const stripped = new Uint8Array(bytes.length - removed);
  let writeAt = 0;
  let readFrom = 0;
  for (const [start, end] of ranges) {
    stripped.set(bytes.subarray(readFrom, start), writeAt);
    writeAt += start - readFrom;
    readFrom = end;
  }
  stripped.set(bytes.subarray(readFrom), writeAt);
  return stripped;
}

function stripAppreciationLetterText(bytes: Uint8Array) {
  const textObjects: Array<[number, number]> = [];
  let cursor = 0;
  while (cursor < bytes.length) {
    cursor = skipWhitespaceAndComments(bytes, cursor);
    if (cursor >= bytes.length) break;
    const token = readToken(bytes, cursor);
    if (token.kind === "keyword" && token.value === "BT") {
      const textEnd = endOfTextObject(bytes, token.end, bytes.length);
      const slice = latin1(bytes, cursor, textEnd);
      const keep = keptText.some((snippet) => slice.includes(snippet));
      const hasText = slice.includes("Tj") || slice.includes("TJ");
      if (hasText && !keep) textObjects.push([cursor, textEnd]);
      cursor = textEnd;
      continue;
    }
    cursor = token.end;
  }

  if (textObjects.length !== TEMPLATE_LETTER_TEXT_OBJECTS) {
    throw new Error("Appreciation letter template text could not be removed.");
  }

  return withoutRanges(bytes, textObjects);
}

function removeTemplateLetter(pdf: PDFDocument) {
  const page = pdf.getPages()[0];
  const contentsRef = page.node.get(PDFName.of("Contents"));
  if (!(contentsRef instanceof PDFRef)) {
    throw new Error("Appreciation letter template is missing its page contents.");
  }

  const stream = pdf.context.lookup(contentsRef);
  if (!(stream instanceof PDFRawStream)) {
    throw new Error("Appreciation letter template is missing its page contents.");
  }
  const preserved: Record<string, PDFObject> = {};
  for (const [key, value] of stream.dict.entries()) {
    const name = key.decodeText();
    if (name === "Filter" || name === "Length" || name === "DecodeParms") continue;
    preserved[name] = value;
  }
  const stripped = stripAppreciationLetterText(decodePDFRawStream(stream).decode());
  pdf.context.assign(contentsRef, pdf.context.flateStream(stripped, preserved));
}

function drawRuns(
  page: ReturnType<PDFDocument["getPages"]>[number],
  runs: TextRun[],
  fonts: Fonts,
  y: number,
  size: number,
  ink: LetterInk,
  justify: boolean,
) {
  const width = runs.reduce((sum, run) => sum + measure(run, fonts, size), 0);
  const gaps = runs.filter((run) => run.text.trim() === "").length;
  const extra = justify && gaps > 0 ? (TEXT_WIDTH - width) / gaps : 0;
  const stretch = extra > 0 && extra < 8 ? extra : 0;
  let cursor = LEFT;
  for (const run of runs) {
    page.drawText(run.text, {
      x: cursor,
      y,
      size,
      font: fonts[run.weight],
      color: inks[ink],
    });
    cursor += measure(run, fonts, size);
    if (run.text.trim() === "") cursor += stretch;
  }
}

export async function fillAppreciationLetterPdf(
  template: ArrayBuffer | Uint8Array,
  fontBytes: {
    light: ArrayBuffer | Uint8Array;
    medium: ArrayBuffer | Uint8Array;
    bold: ArrayBuffer | Uint8Array;
  },
  values: AppreciationLetterValues,
) {
  const pdf = await PDFDocument.load(template);
  pdf.registerFontkit(fontkit);
  const page = pdf.getPages()[0];
  // Covering the original letter still leaves it available to copy. Remove
  // those text objects before drawing the filled letter.
  removeTemplateLetter(pdf);
  const fonts: Fonts = {
    light: await pdf.embedFont(fontBytes.light),
    medium: await pdf.embedFont(fontBytes.medium),
    bold: await pdf.embedFont(fontBytes.bold),
  };

  const dateValue = formatOfferDate(values.letterDate);
  const dateText = `Date: ${dateValue || "Date"}`;
  page.drawText(dateText, {
    x: DATE_RIGHT - fonts.light.widthOfTextAtSize(dateText, DATE_SIZE),
    y: DATE_BASELINE,
    size: DATE_SIZE,
    font: fonts.light,
    color: dateInk,
  });

  let baseline = FIRST_BASELINE;
  for (const block of appreciationLetterBlocks(values)) {
    const lines = wrapBlock(block, fonts);
    lines.forEach((line, index) => {
      drawRuns(page, line, fonts, baseline, block.size, block.ink, index < lines.length - 1);
      baseline -= BODY_LEADING;
    });
    if (block.spaceAfter) baseline -= PARAGRAPH_GAP;
  }

  for (const line of closingLines) {
    drawRuns(page, line.runs, fonts, line.y, 9.8, line.ink, false);
  }

  return pdf.save();
}

export async function buildAppreciationLetterPdf(values: AppreciationLetterValues) {
  const assets = await loadAssets();
  return fillAppreciationLetterPdf(assets.template, assets, values);
}

export async function downloadAppreciationLetterPdf(values: AppreciationLetterValues) {
  const bytes = await buildAppreciationLetterPdf(values);
  const blob = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = appreciationLetterFileName(values.trainerName);
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
