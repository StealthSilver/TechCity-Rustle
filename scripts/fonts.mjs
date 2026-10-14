import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFRawStream,
  PDFArray,
  PDFHexString,
  decodePDFRawStream,
} from "pdf-lib";

const url = new URL("../public/Offer-Letter/Template-B.pdf", import.meta.url);
const pdf = await PDFDocument.load(readFileSync(fileURLToPath(url)));
const page = pdf.getPages()[0];
const fonts = page.node.Resources().lookup(PDFName.of("Font"), PDFDict);

function describe(label, obj, depth = 0) {
  if (!obj || depth > 4) return;
  const dict = obj.dict ?? obj;
  if (!dict?.entries) {
    console.log("  ".repeat(depth) + label, obj?.toString?.()?.slice(0, 200));
    return;
  }
  console.log("  ".repeat(depth) + label);
  for (const [key, value] of dict.entries()) {
    const name = key.decodeText();
    const resolved = pdf.context.lookup(value);
    const text = value?.toString?.()?.slice(0, 180);
    if (name === "FontFile2" || name === "FontFile3" || name === "FontFile") {
      const stream = resolved instanceof PDFRawStream ? resolved : null;
      const len = stream ? decodePDFRawStream(stream).decode().length : 0;
      console.log("  ".repeat(depth + 1) + name, "bytes", len);
      continue;
    }
    if (name === "ToUnicode" || name === "Widths" || name === "W") {
      console.log("  ".repeat(depth + 1) + name, text?.slice(0, 120));
      continue;
    }
    if (resolved?.dict) describe(name, resolved, depth + 1);
    else console.log("  ".repeat(depth + 1) + name, text);
  }
}

for (const [key, value] of fonts.entries()) {
  describe(key.decodeText(), pdf.context.lookup(value));
}

// Estimate justified width from the responsibility line using embedded widths if simple.
console.log("\npage box", page.getSize());
