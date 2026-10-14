import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { PDFDocument, PDFName, PDFRawStream, decodePDFRawStream } from "pdf-lib";

function decodeLiteral(raw) {
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "\\") {
      const next = raw[++i];
      if (next === "n") out += "\n";
      else if (next === "r") out += "\r";
      else if (next === "t") out += "\t";
      else if (next === "b") out += "\b";
      else if (next === "f") out += "\f";
      else if (next === "(" || next === ")" || next === "\\") out += next;
      else if (next >= "0" && next <= "7") {
        let oct = next;
        for (let k = 0; k < 2 && raw[i + 1] >= "0" && raw[i + 1] <= "7"; k++) oct += raw[++i];
        out += String.fromCharCode(parseInt(oct, 8));
      } else out += next ?? "";
    } else out += ch;
  }
  return out;
}

function extract(stream) {
  const text = Buffer.from(stream).toString("latin1");
  const blocks = [...text.matchAll(/BT([\s\S]*?)ET/g)];
  for (const block of blocks) {
    const body = block[1];
    const tm = body.match(/([\d.\-]+) ([\d.\-]+) ([\d.\-]+) ([\d.\-]+) ([\d.\-]+) ([\d.\-]+) Tm/);
    const font = body.match(/\/(F\S+) ([\d.]+) Tf/);
    const strings = [...body.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map((m) => decodeLiteral(m[1]));
    if (strings.length === 0 && !body.includes("Tj")) continue;
    const x = tm ? Number(tm[5]).toFixed(1) : "?";
    const y = tm ? Number(tm[6]).toFixed(1) : "?";
    const size = font ? font[2] : "?";
    const face = font ? font[1] : "?";
    console.log(`y=${y} x=${x} ${face} ${size} | ${strings.join(" | ")}`);
  }
}

const url = new URL("../public/Offer-Letter/Template-B.pdf", import.meta.url);
const pdf = await PDFDocument.load(readFileSync(fileURLToPath(url)));
const contents = pdf.context.lookup(pdf.getPages()[0].node.Contents());
extract(decodePDFRawStream(contents).decode());

const fonts = pdf.getPages()[0].node.Resources()?.lookup(PDFName.of("Font"));
console.log("\nFONTS", fonts?.toString?.()?.slice(0, 2000));
