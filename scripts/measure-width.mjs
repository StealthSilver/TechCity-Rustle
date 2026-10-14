import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { PDFDocument, PDFName, PDFDict, PDFArray } from "pdf-lib";

const url = new URL("../public/Offer-Letter/Template-B.pdf", import.meta.url);
const pdf = await PDFDocument.load(readFileSync(fileURLToPath(url)));
const fonts = pdf.getPages()[0].node.Resources().lookup(PDFName.of("Font"), PDFDict);

function widthsOf(name) {
  const raw = fonts.get(PDFName.of(name));
  const font = pdf.context.lookup(raw);
  console.log(name, font?.constructor?.name, Object.getOwnPropertyNames(Object.getPrototypeOf(font)));
  const firstObj = font.get(PDFName.of("FirstChar"));
  console.log("first", firstObj?.toString?.(), firstObj?.constructor?.name);
  const first = pdf.context.lookup(firstObj).asNumber?.() ?? Number(firstObj.asNumber());
  const arr = pdf.context.lookup(font.get(PDFName.of("Widths")), PDFArray);
  const widths = [];
  for (let i = 0; i < arr.size(); i++) widths.push(arr.get(i).asNumber());
  return { first, widths };
}

function widthOf(font, text, size) {
  let w = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    const gw = font.widths[code - font.first] ?? 500;
    w += (gw * size) / 1000;
  }
  return w;
}

const light = widthsOf("F2+0");
const medium = widthsOf("F3+0");
const bold = widthsOf("F4+0");

const line =
  "You will be responsible for delivering the assigned training sessions, covering the prescribed technical";
const natural = widthOf(light, line, 9.2);
const spaces = line.split(" ").length - 1;
const justified = natural + spaces * 1.656246;
console.log({ natural: natural.toFixed(2), spaces, justified: justified.toFixed(2) });

const line2 =
  "curriculum, conducting interactive sessions, practical activities,and providing appropriate guidance to the";
const n2 = widthOf(light, line2, 9.2);
const s2 = line2.split(" ").length - 1;
console.log("line2", { natural: n2.toFixed(2), spaces: s2, justified: (n2 + s2 * 0.0914).toFixed(2) });

const salary = "\u000145,000/- (Rupees Forty-Five Thousand Only) per month";
console.log("salary natural", widthOf(bold, salary, 9.2).toFixed(2));

const subject = "Subject: Offer of Engagement as Technical Trainer \u0001 MMU Chandigarh";
console.log("subject", widthOf(medium, subject, 10.6).toFixed(2));

console.log("right edge if left 56", (56 + justified).toFixed(2));
