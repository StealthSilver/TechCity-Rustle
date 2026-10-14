import { readFileSync } from "fs";
import fontkit from "@pdf-lib/fontkit";

const regular = fontkit.create(readFileSync("public/fonts/OpenSauceOne-Regular.ttf"));
const bold = fontkit.create(readFileSync("public/fonts/OpenSauceOne-Bold.ttf"));
const noto = fontkit.create(readFileSync("public/fonts/NotoSans-Bold.ttf"));
const fonts = { regular, bold, rupee: noto };

const FONT = 9.2;
const WIDTH = 480;
const LEADING = 13.8;

function measure(run) {
  return fonts[run.weight].widthOfTextAtSize
    ? fonts[run.weight].widthOfTextAtSize(run.text, FONT)
    : fonts[run.weight].layout(run.text).advanceWidth * (FONT / fonts[run.weight].unitsPerEm);
}

// fontkit API
const sample = regular.layout("Sample");
console.log("font methods", {
  units: regular.unitsPerEm,
  advance: sample.advanceWidth,
  widthAt9: (sample.advanceWidth * FONT) / regular.unitsPerEm,
});

function widthOf(run) {
  const font = fonts[run.weight];
  return (font.layout(run.text).advanceWidth * FONT) / font.unitsPerEm;
}

function wrap(runs) {
  const tokens = [];
  for (const run of runs) {
    for (const part of run.text.split(/(\s+)/).filter(Boolean)) {
      tokens.push({ text: part, weight: run.weight });
    }
  }
  const lines = [];
  let current = [];
  let width = 0;
  const push = () => {
    while (current.length && current[0].text.trim() === "") current.shift();
    while (current.length && current.at(-1).text.trim() === "") current.pop();
    if (current.length) lines.push(current.map((t) => t.text).join(""));
    current = [];
    width = 0;
  };
  for (const token of tokens) {
    const tokenWidth = widthOf(token);
    const isSpace = token.text.trim() === "";
    if (!isSpace && width + tokenWidth > WIDTH && width > 0) push();
    if (isSpace && current.length === 0) continue;
    current.push(token);
    width += tokenWidth;
  }
  push();
  return lines;
}

const blocks = [
  [{ text: "Dear ", weight: "regular" }, { text: "Sameer", weight: "bold" }, { text: ",", weight: "regular" }],
  [{ text: "Subject: ", weight: "bold" }, { text: "Offer of Engagement as Technical Trainer – MMU Chandigarh", weight: "bold" }],
  [
    { text: "TechCity Skills Pvt. Ltd.", weight: "bold" },
    { text: " is pleased to offer you the engagement as a Technical Trainer for conducting training at ", weight: "regular" },
    { text: "MMU Chandigarh", weight: "bold" },
    { text: ".", weight: "regular" },
  ],
];

let y = 649;
for (const runs of blocks) {
  const lines = wrap(runs);
  for (const line of lines) {
    console.log(y.toFixed(1), line.slice(0, 110));
    y -= LEADING;
  }
  y -= LEADING;
}
console.log("after sample blocks", y.toFixed(1));
