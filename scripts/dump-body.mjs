import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { PDFDocument, PDFName, PDFDict, PDFRawStream, decodePDFRawStream } from "pdf-lib";

const url = new URL("../public/Offer-Letter/Template-B.pdf", import.meta.url);
const pdf = await PDFDocument.load(readFileSync(fileURLToPath(url)));
const page = pdf.getPages()[0];
const contents = pdf.context.lookup(page.node.Contents());
const text = Buffer.from(decodePDFRawStream(contents).decode()).toString("latin1");
const idx = text.indexOf("(Dear");
console.log("dear index", idx);
writeFileSync("/tmp/template-b-body.txt", text.slice(Math.max(0, idx - 800)));

const fonts = page.node.Resources().lookup(PDFName.of("Font"), PDFDict);
for (const [key, value] of fonts.entries()) {
  const font = pdf.context.lookup(value);
  const base = font?.dict?.lookup(PDFName.of("BaseFont"))?.toString?.();
  const subtype = font?.dict?.lookup(PDFName.of("Subtype"))?.toString?.();
  const descendant = font?.dict?.lookup(PDFName.of("DescendantFonts"));
  console.log(key.decodeText(), subtype, base);
  if (descendant) {
    const arr = pdf.context.lookup(descendant);
    const size = arr.size?.() ?? 0;
    for (let i = 0; i < size; i++) {
      const desc = pdf.context.lookup(arr.get(i));
      const dbase = desc?.dict?.lookup?.(PDFName.of("BaseFont"))?.toString?.();
      const dw = desc?.dict?.lookup?.(PDFName.of("DW"))?.toString?.();
      console.log("  descendant", dbase, "DW", dw);
      const fd = desc?.dict?.lookup?.(PDFName.of("FontDescriptor"));
      if (fd) {
        const descriptor = pdf.context.lookup(fd);
        const name = descriptor?.dict?.lookup?.(PDFName.of("FontName"))?.toString?.();
        const flags = descriptor?.dict?.lookup?.(PDFName.of("Flags"))?.toString?.();
        console.log("  descriptor", name, "flags", flags);
      }
    }
  }
}
