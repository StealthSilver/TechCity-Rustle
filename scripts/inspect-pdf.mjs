import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { PDFDocument, PDFName, PDFDict, PDFRawStream, PDFArray, decodePDFRawStream } from "pdf-lib";

function dumpStream(label, bytes, limit = 6000) {
  const text = Buffer.from(bytes).toString("latin1");
  console.log(`--- ${label} length ${bytes.length} ---`);
  console.log(text.slice(0, limit));
  if (text.length > limit) console.log(`... [${text.length - limit} more chars]`);
}

async function inspect(fileUrl) {
  const path = fileURLToPath(fileUrl);
  const bytes = readFileSync(path);
  const pdf = await PDFDocument.load(bytes);
  console.log("\n====", path.split("/").pop(), "pages", pdf.getPageCount());
  const page = pdf.getPages()[0];
  const { width, height } = page.getSize();
  console.log("size", width, height);
  const resources = page.node.Resources();
  const xobj = resources?.lookup(PDFName.of("XObject"), PDFDict);
  if (xobj) {
    console.log("XObjects:");
    for (const [key, value] of xobj.entries()) {
      const obj = pdf.context.lookup(value);
      const subtype = obj?.dict?.lookup?.(PDFName.of("Subtype"))?.toString?.();
      const bbox = obj?.dict?.lookup?.(PDFName.of("BBox"))?.toString?.();
      const len = obj instanceof PDFRawStream ? decodePDFRawStream(obj).decode().length : 0;
      console.log(" ", key.decodeText(), "subtype", subtype, "bbox", bbox, "decodedLen", len);
    }
  }

  const contents = page.node.Contents();
  if (contents) {
    const looked = pdf.context.lookup(contents);
    if (looked instanceof PDFRawStream) {
      dumpStream("page content", decodePDFRawStream(looked).decode(), 2000);
    } else if (looked instanceof PDFArray) {
      console.log("page content array size", looked.size());
      for (let i = 0; i < looked.size(); i++) {
        const item = pdf.context.lookup(looked.get(i));
        if (item instanceof PDFRawStream) {
          dumpStream(`page content ${i}`, decodePDFRawStream(item).decode(), 1500);
        }
      }
    }
  }

  if (xobj) {
    for (const [key, value] of xobj.entries()) {
      const obj = pdf.context.lookup(value);
      if (!(obj instanceof PDFRawStream)) continue;
      const subtype = obj.dict?.lookup?.(PDFName.of("Subtype"))?.toString?.();
      if (subtype !== "/Form") continue;
      const decoded = decodePDFRawStream(obj).decode();
      const text = Buffer.from(decoded).toString("latin1");
      if (!text.includes("Tj") && !text.includes("TJ") && !text.includes("BT")) continue;
      dumpStream(`form ${key.decodeText()}`, decoded, 8000);
    }
  }
}

const base = new URL("../public/Offer-Letter/", import.meta.url);
await inspect(new URL("Template-B.pdf", base));
await inspect(new URL("Offer Letter- Sameer (MMU).pdf", base));
