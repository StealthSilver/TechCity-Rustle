import fontkit from "@pdf-lib/fontkit";
import {
  decodePDFRawStream,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFRef,
  rgb,
  type PDFFont,
  type PDFObject,
} from "pdf-lib";
import {
  offerLetterBlocks,
  offerLetterFileName,
  type OfferLetterTemplate,
  type OfferLetterValues,
  type TextRun,
  type TextWeight,
} from "@/lib/offer-letter";

const ink = rgb(0.08, 0.08, 0.08);
const slate = rgb(30 / 255, 41 / 255, 59 / 255);
const letterPaper = rgb(245 / 255, 247 / 255, 251 / 255);

type Fonts = Record<TextWeight, PDFFont> & { salary: PDFFont };

type Layout = {
  url: string;
  regularFont: string;
  boldFont: string;
  salaryFont: string;
  left: number;
  textWidth: number;
  fontSize: number;
  leading: number;
  firstBaseline: number;
  subjectSize: number;
  subjectLeading: number;
  ink: ReturnType<typeof rgb>;
  cover: { x: number; y: number; width: number; height: number; color: ReturnType<typeof rgb> };
  watermark: { x: number; y: number; width: number; height: number };
  closing: Array<{ text: string; weight: TextWeight; y: number }>;
};

const layouts: Record<OfferLetterTemplate, Layout> = {
  old: {
    url: "/Offer-Letter/Offer%20Letter-%20Sameer%20(MMU).pdf",
    regularFont: "/fonts/OpenSauceOne-Regular.ttf",
    boldFont: "/fonts/OpenSauceOne-Bold.ttf",
    salaryFont: "/fonts/OpenSauceOne-Bold.ttf",
    left: 18.1,
    textWidth: 545,
    fontSize: 11.72,
    leading: 16.5,
    firstBaseline: 673,
    subjectSize: 11.72,
    subjectLeading: 16.5,
    ink,
    cover: { x: 14, y: 224, width: 568, height: 461, color: rgb(1, 1, 1) },
    watermark: { x: 113, y: 268, width: 370, height: 370 },
    closing: [
      { text: "Sincerely,", weight: "regular", y: 210.7 },
      { text: "For TechCity Skills Pvt. Ltd.", weight: "bold", y: 194.3 },
      { text: "Gunjan Soam", weight: "bold", y: 177.8 },
      { text: "Director", weight: "bold", y: 161.3 },
      { text: "Signature: ______________________", weight: "bold", y: 95.3 },
    ],
  },
  new: {
    url: "/Offer-Letter/Template-B.pdf",
    regularFont: "/fonts/Poppins-Light.ttf",
    boldFont: "/fonts/Poppins-Medium.ttf",
    salaryFont: "/fonts/Poppins-Bold.ttf",
    left: 56,
    textWidth: 483.5,
    fontSize: 9.2,
    leading: 13.8,
    firstBaseline: 649.05,
    subjectSize: 10.6,
    subjectLeading: 15,
    ink: slate,
    cover: { x: 32, y: 170, width: 530, height: 495, color: letterPaper },
    watermark: { x: 128, y: 248, width: 340, height: 340 },
    closing: [
      { text: "Sincerely,", weight: "regular", y: 227.25 },
      { text: "For TechCity Skills Pvt. Ltd.", weight: "bold", y: 210.45 },
      { text: "Gunjan Soam", weight: "bold", y: 194.65 },
      { text: "Director", weight: "bold", y: 178.85 },
    ],
  },
};

type Assets = {
  template: ArrayBuffer;
  regular: ArrayBuffer;
  bold: ArrayBuffer;
  salary: ArrayBuffer;
  noto: ArrayBuffer;
  watermark: ArrayBuffer;
};

const assetsPromises = new Map<OfferLetterTemplate, Promise<Assets>>();

function loadBuffer(url: string) {
  return fetch(url).then((response) => response.arrayBuffer());
}

function loadAssets(template: OfferLetterTemplate) {
  const cached = assetsPromises.get(template);
  if (cached) return cached;

  const layout = layouts[template];
  const bold = loadBuffer(layout.boldFont);
  const promise = Promise.all([
    loadBuffer(layout.url),
    loadBuffer(layout.regularFont),
    bold,
    layout.salaryFont === layout.boldFont ? bold : loadBuffer(layout.salaryFont),
    loadBuffer("/fonts/NotoSans-Bold.ttf"),
    loadBuffer("/offer-letter-watermark.png"),
  ]).then(([templateBytes, regular, boldBytes, salary, noto, watermark]) => ({
    template: templateBytes,
    regular,
    bold: boldBytes,
    salary,
    noto,
    watermark,
  }));
  assetsPromises.set(template, promise);
  return promise;
}

function fontFor(run: TextRun, blockRuns: TextRun[], fonts: Fonts) {
  if (run.weight === "bold" && blockRuns.some((item) => item.weight === "rupee")) {
    return fonts.salary;
  }
  return fonts[run.weight];
}

function measure(run: TextRun, blockRuns: TextRun[], fonts: Fonts, size: number) {
  return fontFor(run, blockRuns, fonts).widthOfTextAtSize(run.text, size);
}

function wrapBlock(runs: TextRun[], fonts: Fonts, textWidth: number, size: number) {
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
    const tokenWidth = measure(token, runs, fonts, size);
    const isSpace = token.text.trim() === "";
    if (!isSpace && width + tokenWidth > textWidth && width > 0) {
      pushLine();
    }
    if (isSpace && current.length === 0) continue;
    current.push(token);
    width += tokenWidth;
  }
  pushLine();
  return lines;
}

const TEMPLATE_FORM = "X27";
const TEMPLATE_BODY_MCID_START = 2;
const TEMPLATE_BODY_MCID_END = 18;
// Text objects for the letter body and closing in the Canva template.
const TEMPLATE_LETTER_TEXT_OBJECTS = 41;
const NEW_TEMPLATE_LETTER_BLOCKS = 16;

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

function readMarkedOpener(bytes: Uint8Array, start: number) {
  let cursor = skipWhitespaceAndComments(bytes, start);
  if (bytes[cursor] !== 0x3c || bytes[cursor + 1] !== 0x3c) return null;
  cursor = skipWhitespaceAndComments(bytes, cursor + 2);
  const name = readToken(bytes, cursor);
  if (name.kind !== "name" || name.value !== "/MCID") return null;
  cursor = skipWhitespaceAndComments(bytes, name.end);
  const number = readToken(bytes, cursor);
  if (!/^\d+$/.test(number.value)) return null;
  cursor = skipWhitespaceAndComments(bytes, number.end);
  if (bytes[cursor] !== 0x3e || bytes[cursor + 1] !== 0x3e) return null;
  cursor = skipWhitespaceAndComments(bytes, cursor + 2);
  const keyword = readToken(bytes, cursor);
  if (keyword.kind !== "keyword" || keyword.value !== "BDC") return null;
  return { end: keyword.end, mcid: Number(number.value) };
}

function endOfMarkedContent(bytes: Uint8Array, start: number) {
  let depth = 1;
  let cursor = start;
  while (cursor < bytes.length && depth > 0) {
    cursor = skipWhitespaceAndComments(bytes, cursor);
    if (cursor >= bytes.length) break;
    const token = readToken(bytes, cursor);
    cursor = token.end;
    if (token.kind === "keyword" && (token.value === "BDC" || token.value === "BMC")) depth += 1;
    else if (token.kind === "keyword" && token.value === "EMC") depth -= 1;
  }
  if (depth !== 0) throw new Error("Offer letter template text could not be removed.");
  return cursor;
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
  throw new Error("Offer letter template text could not be removed.");
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

function stripTemplateLetterText(bytes: Uint8Array) {
  const sections: Array<[number, number]> = [];
  let cursor = 0;
  while (cursor < bytes.length) {
    cursor = skipWhitespaceAndComments(bytes, cursor);
    if (cursor >= bytes.length) break;
    const token = readToken(bytes, cursor);
    cursor = token.end;
    if (token.kind !== "name" || (token.value !== "/H1" && token.value !== "/H2")) continue;
    const opener = readMarkedOpener(bytes, cursor);
    if (!opener) continue;
    if (opener.mcid < TEMPLATE_BODY_MCID_START || opener.mcid > TEMPLATE_BODY_MCID_END) continue;
    const end = endOfMarkedContent(bytes, opener.end);
    sections.push([cursor, end]);
    cursor = end;
  }

  if (sections.length !== TEMPLATE_BODY_MCID_END - TEMPLATE_BODY_MCID_START + 1) {
    throw new Error("Offer letter template text could not be removed.");
  }

  // Drop only the text objects. The sections also contain the graphics-state
  // saves that the letterhead art around them depends on.
  const textObjects: Array<[number, number]> = [];
  for (const [start, end] of sections) {
    let index = start;
    while (index < end) {
      index = skipWhitespaceAndComments(bytes, index);
      if (index >= end) break;
      const token = readToken(bytes, index);
      if (token.kind === "keyword" && token.value === "BT") {
        const textEnd = endOfTextObject(bytes, token.end, end);
        textObjects.push([index, textEnd]);
        index = textEnd;
        continue;
      }
      index = token.end;
    }
  }

  if (textObjects.length !== TEMPLATE_LETTER_TEXT_OBJECTS) {
    throw new Error("Offer letter template text could not be removed.");
  }

  return withoutRanges(bytes, textObjects);
}

function removeTemplateLetter(pdf: PDFDocument) {
  const page = pdf.getPages()[0];
  pdf.catalog.delete(PDFName.of("StructTreeRoot"));
  pdf.catalog.delete(PDFName.of("MarkInfo"));
  pdf.catalog.delete(PDFName.of("Outlines"));
  page.node.delete(PDFName.of("StructParents"));

  const formRef = page.node
    .Resources()
    ?.lookup(PDFName.of("XObject"), PDFDict)
    ?.get(PDFName.of(TEMPLATE_FORM));
  if (!(formRef instanceof PDFRef)) {
    throw new Error("Offer letter template is missing its letter form.");
  }

  const form = pdf.context.lookup(formRef);
  if (!(form instanceof PDFRawStream)) {
    throw new Error("Offer letter template is missing its letter form.");
  }
  const preserved: Record<string, PDFObject> = {};
  for (const [key, value] of form.dict.entries()) {
    const name = key.decodeText();
    if (name === "Filter" || name === "Length" || name === "DecodeParms") continue;
    preserved[name] = value;
  }
  const stripped = stripTemplateLetterText(decodePDFRawStream(form).decode());
  pdf.context.assign(formRef, pdf.context.flateStream(stripped, preserved));
}

function isNewTemplateLetterBlock(bytes: Uint8Array, start: number) {
  let cursor = skipWhitespaceAndComments(bytes, start);
  const numbers: number[] = [];
  for (let index = 0; index < 6; index += 1) {
    const token = readToken(bytes, cursor);
    if (token.kind !== "other" || !/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(token.value)) return false;
    numbers.push(Number(token.value));
    cursor = skipWhitespaceAndComments(bytes, token.end);
  }
  const keyword = readToken(bytes, cursor);
  if (keyword.kind !== "keyword" || keyword.value !== "cm") return false;
  const [a, b, c, d, x, y] = numbers;
  return a === 1 && b === 0 && c === 0 && d === 1 && Math.abs(x - 56) < 0.2 && y >= 160 && y <= 660;
}

function endOfGraphicsState(bytes: Uint8Array, start: number) {
  let depth = 0;
  let cursor = start;
  while (cursor < bytes.length) {
    cursor = skipWhitespaceAndComments(bytes, cursor);
    if (cursor >= bytes.length) break;
    const token = readToken(bytes, cursor);
    cursor = token.end;
    if (token.kind === "keyword" && token.value === "q") depth += 1;
    else if (token.kind === "keyword" && token.value === "Q") {
      depth -= 1;
      if (depth === 0) return cursor;
    }
  }
  throw new Error("Offer letter template text could not be removed.");
}

function stripNewTemplateLetter(bytes: Uint8Array) {
  const ranges: Array<[number, number]> = [];
  let cursor = 0;
  while (cursor < bytes.length) {
    cursor = skipWhitespaceAndComments(bytes, cursor);
    if (cursor >= bytes.length) break;
    const token = readToken(bytes, cursor);
    if (token.kind === "keyword" && token.value === "q" && isNewTemplateLetterBlock(bytes, token.end)) {
      const end = endOfGraphicsState(bytes, cursor);
      ranges.push([cursor, end]);
      cursor = end;
      continue;
    }
    cursor = token.end;
  }

  if (ranges.length !== NEW_TEMPLATE_LETTER_BLOCKS) {
    throw new Error("Offer letter template text could not be removed.");
  }
  return withoutRanges(bytes, ranges);
}

function removeNewTemplateLetter(pdf: PDFDocument) {
  const page = pdf.getPages()[0];
  const contents = page.node.get(PDFName.of("Contents"));
  if (!(contents instanceof PDFRef)) {
    throw new Error("Offer letter template text could not be removed.");
  }
  const stream = pdf.context.lookup(contents);
  if (!(stream instanceof PDFRawStream)) {
    throw new Error("Offer letter template text could not be removed.");
  }
  const preserved: Record<string, PDFObject> = {};
  for (const [key, value] of stream.dict.entries()) {
    const name = key.decodeText();
    if (name === "Filter" || name === "Length" || name === "DecodeParms") continue;
    preserved[name] = value;
  }
  const stripped = stripNewTemplateLetter(decodePDFRawStream(stream).decode());
  pdf.context.assign(contents, pdf.context.flateStream(stripped, preserved));
}

function drawOfferLetter(
  page: ReturnType<PDFDocument["getPages"]>[number],
  fonts: Fonts,
  values: OfferLetterValues,
  layout: Layout,
) {
  let baseline = layout.firstBaseline;
  for (const block of offerLetterBlocks(values)) {
    const subject = block.runs[0]?.text === "Subject: ";
    const size = subject ? layout.subjectSize : layout.fontSize;
    const leading = subject ? layout.subjectLeading : layout.leading;
    const lines = wrapBlock(block.runs, fonts, layout.textWidth, size);
    for (const line of lines) {
      let x = layout.left;
      for (const run of line) {
        page.drawText(run.text, {
          x,
          y: baseline,
          size,
          font: fontFor(run, block.runs, fonts),
          color: layout.ink,
        });
        x += measure(run, block.runs, fonts, size);
      }
      baseline -= leading;
    }
    if (block.spaceAfter) baseline -= layout.leading;
  }

  for (const line of layout.closing) {
    page.drawText(line.text, {
      x: layout.left,
      y: line.y,
      size: layout.fontSize,
      font: line.weight === "bold" ? fonts.bold : fonts[line.weight],
      color: layout.ink,
    });
  }
}

export async function fillOfferLetterPdf(
  template: ArrayBuffer | Uint8Array,
  fontBytes: {
    regular: ArrayBuffer | Uint8Array;
    bold: ArrayBuffer | Uint8Array;
    salary: ArrayBuffer | Uint8Array;
    noto: ArrayBuffer | Uint8Array;
  },
  values: OfferLetterValues,
  templateId: OfferLetterTemplate,
  watermark?: ArrayBuffer | Uint8Array,
) {
  const pdf = await PDFDocument.load(template);
  pdf.registerFontkit(fontkit);
  const page = pdf.getPages()[0];
  const layout = layouts[templateId];
  // The cover only hides the original letter. Copy still reads that text
  // unless it is removed from the file first.
  if (templateId === "old") removeTemplateLetter(pdf);
  else removeNewTemplateLetter(pdf);

  const bold = await pdf.embedFont(fontBytes.bold);
  const fonts: Fonts = {
    regular: await pdf.embedFont(fontBytes.regular),
    bold,
    salary: fontBytes.salary === fontBytes.bold ? bold : await pdf.embedFont(fontBytes.salary),
    rupee: await pdf.embedFont(fontBytes.noto),
  };

  page.drawRectangle(layout.cover);

  if (watermark) {
    const image = await pdf.embedPng(watermark);
    page.drawImage(image, { ...layout.watermark, opacity: 0.11 });
  }

  drawOfferLetter(page, fonts, values, layout);
  return pdf.save();
}

export async function buildOfferLetterPdf(
  values: OfferLetterValues,
  template: OfferLetterTemplate = "old",
) {
  const assets = await loadAssets(template);
  return fillOfferLetterPdf(assets.template, assets, values, template, assets.watermark);
}

export async function downloadOfferLetterPdf(
  values: OfferLetterValues,
  template: OfferLetterTemplate = "old",
) {
  const bytes = await buildOfferLetterPdf(values, template);
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
