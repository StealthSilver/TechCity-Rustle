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
  certificateFileName,
  certificateTraining,
  sentenceAfter,
  sentenceBefore,
  type CertificateTemplate,
  type CertificateValues,
} from "./certificate";
import { composeNewCertificate } from "./new-certificate";

const TEMPLATE_URL = "/Certificate/Varun%20Kant.pdf";
const NEW_TEMPLATE_URL = "/Certificate/New_Certificate.pdf";

const TRANSPARENT_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

// The template page is 842.25pt wide. The name and the sentence are centered on it.
const CENTER = 421.125;
// Anastasia Script on the template, matched to Pinyon Script's advance width for "Varun Kant".
const NAME_SIZE = 70.66;
const NAME_BASELINE = 292.3598;
const NAME_MAX_WIDTH = 520;
// Nourd on the template, scaled so Nunito's cap height and line width match.
const BODY_SIZE = 15.88;
const BODY_MIDLINE = 238.5267;
const BODY_LEADING = 19.5074;

const nameInk = rgb(0.0863, 0.0627, 0.0353);
const bodyInk = rgb(0.6588, 0.5176, 0.3608);

const BODY_TEXT_OBJECTS = 3;

type Weight = "regular" | "bold";
type Run = { text: string; weight: Weight };
type Fonts = Record<Weight, PDFFont> & { script: PDFFont };

let assetsPromise: Promise<{
  template: ArrayBuffer;
  regular: ArrayBuffer;
  bold: ArrayBuffer;
  script: ArrayBuffer;
}> | null = null;

let newTemplatePromise: Promise<ArrayBuffer> | null = null;

function loadAssets() {
  if (!assetsPromise) {
    const load = (url: string) => fetch(url).then((response) => response.arrayBuffer());
    assetsPromise = Promise.all([
      load(TEMPLATE_URL),
      load("/fonts/Nunito-Regular.ttf"),
      load("/fonts/Nunito-Bold.ttf"),
      load("/fonts/PinyonScript-Regular.ttf"),
    ]).then(([template, regular, bold, script]) => ({ template, regular, bold, script }));
  }
  return assetsPromise;
}

function loadNewTemplate() {
  if (!newTemplatePromise) {
    newTemplatePromise = fetch(NEW_TEMPLATE_URL)
      .then((response) => {
        if (!response.ok) throw new Error("Certificate template could not be read.");
        return response.arrayBuffer();
      })
      .catch((error: unknown) => {
        newTemplatePromise = null;
        throw error;
      });
  }
  return newTemplatePromise;
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

function readToken(bytes: Uint8Array, start: number) {
  if (start >= bytes.length) return { end: start, kind: "other" as const, value: "" };
  const byte = bytes[start];
  if (byte === 0x28) return { end: skipLiteralString(bytes, start), kind: "other" as const, value: "" };
  if (byte === 0x3c) {
    if (bytes[start + 1] === 0x3c) return { end: start + 2, kind: "other" as const, value: "<<" };
    let cursor = start + 1;
    while (cursor < bytes.length && bytes[cursor] !== 0x3e) cursor += 1;
    return { end: Math.min(cursor + 1, bytes.length), kind: "other" as const, value: "" };
  }
  if (byte === 0x3e && bytes[start + 1] === 0x3e) {
    return { end: start + 2, kind: "other" as const, value: ">>" };
  }
  if (isDelimiterByte(byte)) {
    return { end: start + 1, kind: "other" as const, value: String.fromCharCode(byte) };
  }

  let cursor = start + 1;
  while (cursor < bytes.length && !isWhitespaceByte(bytes[cursor]) && !isDelimiterByte(bytes[cursor])) {
    cursor += 1;
  }
  let value = "";
  for (let index = start; index < cursor; index += 1) value += String.fromCharCode(bytes[index]);
  return { end: cursor, kind: "word" as const, value };
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

function stripBodyText(bytes: Uint8Array) {
  const ranges: Array<[number, number]> = [];
  let cursor = 0;
  while (cursor < bytes.length) {
    cursor = skipWhitespaceAndComments(bytes, cursor);
    if (cursor >= bytes.length) break;
    const token = readToken(bytes, cursor);
    if (token.kind === "word" && token.value === "BT") {
      const start = cursor;
      let end = token.end;
      let body = "";
      cursor = token.end;
      while (cursor < bytes.length) {
        cursor = skipWhitespaceAndComments(bytes, cursor);
        if (cursor >= bytes.length) break;
        const next = readToken(bytes, cursor);
        if (next.kind === "word") body += `${next.value} `;
        cursor = next.end;
        if (next.kind === "word" && next.value === "ET") {
          end = next.end;
          break;
        }
      }
      if (body.includes("19.02 Tf")) ranges.push([start, end]);
      continue;
    }
    cursor = token.end;
  }

  if (ranges.length !== BODY_TEXT_OBJECTS) {
    throw new Error("Certificate template text could not be removed.");
  }
  return withoutRanges(bytes, ranges);
}

function preservedEntries(dict: PDFDict) {
  const preserved: Record<string, PDFObject> = {};
  for (const [key, value] of dict.entries()) {
    const name = key.decodeText();
    if (name === "Filter" || name === "Length" || name === "DecodeParms") continue;
    preserved[name] = value;
  }
  return preserved;
}

function replaceStream(pdf: PDFDocument, ref: PDFRef, bytes: Uint8Array) {
  const stream = pdf.context.lookup(ref);
  if (!(stream instanceof PDFRawStream)) {
    throw new Error("Certificate template text could not be removed.");
  }
  pdf.context.assign(ref, pdf.context.flateStream(bytes, preservedEntries(stream.dict)));
}

function templateForms(pdf: PDFDocument) {
  const page = pdf.getPages()[0];
  const resources = page.node.Resources();
  const objects = resources?.lookup(PDFName.of("XObject"), PDFDict);
  const formRef = objects?.get(PDFName.of("X29"));
  if (!(formRef instanceof PDFRef)) {
    throw new Error("Certificate template could not be read.");
  }
  const form = pdf.context.lookup(formRef);
  if (!(form instanceof PDFRawStream)) {
    throw new Error("Certificate template could not be read.");
  }
  const formResources = pdf.context.lookup(form.dict.get(PDFName.of("Resources")));
  if (!(formResources instanceof PDFDict)) {
    throw new Error("Certificate template could not be read.");
  }
  const formObjects = formResources.lookup(PDFName.of("XObject"), PDFDict);
  if (!(formObjects instanceof PDFDict)) {
    throw new Error("Certificate template could not be read.");
  }
  return { formRef, form, formObjects };
}

function clearCandidateName(pdf: PDFDocument, formObjects: PDFDict) {
  const nameRef = formObjects.get(PDFName.of("X13"));
  if (!(nameRef instanceof PDFRef)) {
    throw new Error("Certificate template text could not be removed.");
  }
  replaceStream(pdf, nameRef, new Uint8Array());
}

function words(text: string, weight: Weight): Run[] {
  return text
    .split(/(\s+)/)
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, weight }));
}

function measure(run: Run, fonts: Fonts) {
  return fonts[run.weight].widthOfTextAtSize(run.text, BODY_SIZE);
}

function trimLine(line: Run[]) {
  const next = line.slice();
  while (next.length > 0 && next[0].text.trim() === "") next.shift();
  while (next.length > 0 && next[next.length - 1].text.trim() === "") next.pop();
  return next;
}

function wrapSentence(tokens: Run[], fonts: Fonts, column: number) {
  const lines: Run[][] = [];
  let line: Run[] = [];
  let width = 0;

  for (const token of tokens) {
    const space = token.text.trim() === "";
    const tokenWidth = measure(token, fonts);
    if (!space && width + tokenWidth > column && line.some((item) => item.text.trim() !== "")) {
      lines.push(trimLine(line));
      line = [];
      width = 0;
    }
    if (space && line.length === 0) continue;
    line.push(token);
    width += tokenWidth;
  }
  const last = trimLine(line);
  if (last.length > 0) lines.push(last);
  return lines;
}

function lineWidth(line: Run[], fonts: Fonts) {
  return line.reduce((sum, run) => sum + measure(run, fonts), 0);
}

function drawSentence(
  page: ReturnType<PDFDocument["getPages"]>[number],
  fonts: Fonts,
  training: string,
) {
  const canonical =
    fonts.regular.widthOfTextAtSize(sentenceBefore, BODY_SIZE) +
    fonts.bold.widthOfTextAtSize("AI Tools and Prompt Engineering", BODY_SIZE);
  const lines = wrapSentence(
    [...words(sentenceBefore, "regular"), ...words(training, "bold"), ...words(sentenceAfter, "regular")],
    fonts,
    canonical + 0.75,
  );
  const firstBaseline = BODY_MIDLINE + ((lines.length - 1) * BODY_LEADING) / 2;

  lines.forEach((line, index) => {
    let x = CENTER - lineWidth(line, fonts) / 2;
    const y = firstBaseline - index * BODY_LEADING;
    for (const run of line) {
      page.drawText(run.text, {
        x,
        y,
        size: BODY_SIZE,
        font: fonts[run.weight],
        color: bodyInk,
      });
      x += measure(run, fonts);
    }
  });
}

function drawName(
  page: ReturnType<PDFDocument["getPages"]>[number],
  font: PDFFont,
  name: string,
) {
  let size = NAME_SIZE;
  let width = font.widthOfTextAtSize(name, size);
  if (width > NAME_MAX_WIDTH) {
    size *= NAME_MAX_WIDTH / width;
    width = NAME_MAX_WIDTH;
  }
  page.drawText(name, {
    x: CENTER - width / 2,
    y: NAME_BASELINE,
    size,
    font,
    color: nameInk,
  });
}

export async function fillCertificatePdf(
  template: ArrayBuffer | Uint8Array,
  fontBytes: {
    regular: ArrayBuffer | Uint8Array;
    bold: ArrayBuffer | Uint8Array;
    script: ArrayBuffer | Uint8Array;
  },
  values: CertificateValues,
  logo?: ArrayBuffer | Uint8Array,
) {
  const pdf = await PDFDocument.load(template);
  pdf.registerFontkit(fontkit);
  const { formRef, form, formObjects } = templateForms(pdf);
  const training = certificateTraining(values.trainingName);
  const name = values.candidateName.trim();

  replaceStream(pdf, formRef, stripBodyText(decodePDFRawStream(form).decode()));
  if (name) clearCandidateName(pdf, formObjects);
  const image = await pdf.embedPng(logo ?? TRANSPARENT_PNG);
  formObjects.set(PDFName.of("X24"), image.ref);

  const fonts: Fonts = {
    regular: await pdf.embedFont(fontBytes.regular),
    bold: await pdf.embedFont(fontBytes.bold),
    script: await pdf.embedFont(fontBytes.script),
  };
  const page = pdf.getPages()[0];
  if (training) drawSentence(page, fonts, training);
  if (name) drawName(page, fonts.script, name);
  return pdf.save();
}

function templateJpeg(pdf: PDFDocument) {
  const page = pdf.getPages()[0];
  const resources = page.node.Resources();
  const objects = resources?.lookup(PDFName.of("XObject"), PDFDict);
  const image = objects?.get(PDFName.of("Im0"));
  const stream = image ? pdf.context.lookup(image) : undefined;
  if (!(stream instanceof PDFRawStream)) {
    throw new Error("Certificate template could not be read.");
  }
  return stream.contents;
}

async function buildNewCertificatePdf(values: CertificateValues, logo?: ArrayBuffer | Uint8Array) {
  const template = await loadNewTemplate();
  const source = await PDFDocument.load(template);
  const { width, height } = source.getPages()[0].getSize();
  const logoBytes =
    logo == null ? undefined : logo instanceof Uint8Array ? logo : new Uint8Array(logo);
  const png = await composeNewCertificate(templateJpeg(source), values, logoBytes);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([width, height]);
  const image = await pdf.embedPng(png);
  page.drawImage(image, { x: 0, y: 0, width, height });
  return pdf.save();
}

export async function buildCertificatePdf(
  values: CertificateValues,
  template: CertificateTemplate = "old",
  logo?: ArrayBuffer | Uint8Array,
) {
  if (template === "new") return buildNewCertificatePdf(values, logo);
  const assets = await loadAssets();
  return fillCertificatePdf(assets.template, assets, values, logo);
}

export async function downloadCertificatePdf(
  values: CertificateValues,
  template: CertificateTemplate = "old",
  logo?: ArrayBuffer | Uint8Array,
) {
  const bytes = await buildCertificatePdf(values, template, logo);
  const blob = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = certificateFileName(values.candidateName);
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
