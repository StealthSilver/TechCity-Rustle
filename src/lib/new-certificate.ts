import {
  certificateTraining,
  isHttpUrl,
  sentenceAfter,
  sentenceBefore,
  type CertificateValues,
} from "@/lib/certificate";
import { qrMatrix } from "@/lib/qr-matrix";

const SCALE = 4;
const NAME_FONT = "CertificatePoppinsBold";
const BODY_FONT = "CertificatePoppinsMedium";
const BOLD_FONT = "CertificatePoppinsBold";

type Rgb = [number, number, number];
type Run = { text: string; weight: "regular" | "bold" };
type Box = { left: number; top: number; right: number; bottom: number };

const fontsReady = new Map<string, Promise<void>>();

function loadFont(family: string, url: string) {
  const cached = fontsReady.get(family);
  if (cached) return cached;
  const pending = (async () => {
    const face = new FontFace(family, `url(${url})`);
    await face.load();
    document.fonts.add(face);
  })();
  fontsReady.set(family, pending);
  return pending;
}

function at(data: Uint8ClampedArray, width: number, x: number, y: number): Rgb {
  const index = (y * width + x) * 4;
  return [data[index], data[index + 1], data[index + 2]];
}

function paint(data: Uint8ClampedArray, width: number, x: number, y: number, color: Rgb) {
  const index = (y * width + x) * 4;
  data[index] = color[0];
  data[index + 1] = color[1];
  data[index + 2] = color[2];
  data[index + 3] = 255;
}

function isGold(color: Rgb) {
  const [red, green, blue] = color;
  return red > 200 && green > 110 && green < 200 && blue < 80 && red > green + 40;
}

function isInk(color: Rgb) {
  const [red, green, blue] = color;
  return red < 165 && green < 175 && blue < 200 && red + green + blue < 460;
}

function average(colors: Rgb[], fallback: Rgb): Rgb {
  if (colors.length === 0) return fallback;
  let red = 0;
  let green = 0;
  let blue = 0;
  for (const color of colors) {
    red += color[0];
    green += color[1];
    blue += color[2];
  }
  const count = colors.length;
  return [Math.round(red / count), Math.round(green / count), Math.round(blue / count)];
}

function css(color: Rgb) {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

function headerBottom(data: Uint8ClampedArray, width: number) {
  for (let y = 400; y < 800; y += 1) {
    const [red, green, blue] = at(data, width, 200, y);
    if (red > 210 && green > 210 && blue > 210) return y - 1;
  }
  return 520;
}

function findBadge(data: Uint8ClampedArray, width: number, height: number) {
  let count = 0;
  let sx = 0;
  let sy = 0;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  const limitY = Math.min(height, 500);
  for (let y = 20; y < limitY; y += 1) {
    for (let x = 2500; x < width - 20; x += 1) {
      if (!isGold(at(data, width, x, y))) continue;
      count += 1;
      sx += x;
      sy += y;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (count < 200) throw new Error("Certificate template could not be read.");
  const cx = sx / count;
  const cy = sy / count;
  let outer = 0;
  for (let y = minY; y <= maxY; y += 2) {
    for (let x = minX; x <= maxX; x += 2) {
      if (!isGold(at(data, width, x, y))) continue;
      outer = Math.max(outer, Math.hypot(x - cx, y - cy));
    }
  }
  let inner = outer;
  for (let angle = 0; angle < 360; angle += 12) {
    const radians = (angle * Math.PI) / 180;
    for (let distance = 0; distance < outer; distance += 1) {
      const x = Math.round(cx + Math.cos(radians) * distance);
      const y = Math.round(cy + Math.sin(radians) * distance);
      if (x < 0 || y < 0 || x >= width || y >= height) break;
      if (isGold(at(data, width, x, y))) {
        inner = Math.min(inner, distance);
        break;
      }
    }
  }
  return { cx, cy, inner, outer: outer + 3 };
}

function clearBadge(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  badge: { cx: number; cy: number; inner: number; outer: number },
  keepRing: boolean,
) {
  const { cx, cy, inner, outer } = badge;
  if (keepRing) {
    const radius = inner - 2;
    const left = Math.max(0, Math.floor(cx - radius));
    const right = Math.min(width - 1, Math.ceil(cx + radius));
    const top = Math.max(0, Math.floor(cy - radius));
    const bottom = Math.min(height - 1, Math.ceil(cy + radius));
    const limit = radius * radius;
    for (let y = top; y <= bottom; y += 1) {
      for (let x = left; x <= right; x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy > limit) continue;
        paint(data, width, x, y, [255, 255, 255]);
      }
    }
    return;
  }

  // Cover the badge with a rectangle of the header pattern, so no circle remains.
  const floor = Math.min(headerBottom(data, width) - 6, height - 1);
  const left = Math.max(0, Math.floor(cx - outer - 28));
  const right = width - 1;
  const span = right - left + 1;
  let source = left - span;
  if (source < 720) source = 720;
  for (let y = 0; y <= floor; y += 1) {
    for (let x = 0; x < span; x += 1) {
      const sx = Math.min(width - 1, source + x);
      paint(data, width, left + x, y, at(data, width, sx, y));
    }
  }
}

function inkBox(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bounds: Box,
) {
  let left = width;
  let top = height;
  let right = 0;
  let bottom = 0;
  let count = 0;
  const colors: Rgb[] = [];
  for (let y = bounds.top; y <= bounds.bottom; y += 1) {
    for (let x = bounds.left; x <= bounds.right; x += 1) {
      const color = at(data, width, x, y);
      if (!isInk(color)) continue;
      count += 1;
      if (x < left) left = x;
      if (y < top) top = y;
      if (x > right) right = x;
      if (y > bottom) bottom = y;
      if (count % 7 === 0) colors.push(color);
    }
  }
  if (count < 40) return null;
  return { box: { left, top, right, bottom }, color: average(colors, [20, 28, 48]) };
}

function rowBands(data: Uint8ClampedArray, width: number, bounds: Box) {
  const rows: number[] = [];
  for (let y = bounds.top; y <= bounds.bottom; y += 1) {
    let count = 0;
    for (let x = bounds.left; x <= bounds.right; x += 4) {
      if (isInk(at(data, width, x, y))) count += 1;
    }
    if (count > 4) rows.push(y);
  }
  const bands: Array<{ top: number; bottom: number }> = [];
  let start = rows[0];
  let previous = rows[0];
  for (const y of rows.slice(1)) {
    if (y > previous + 4) {
      bands.push({ top: start, bottom: previous });
      start = y;
    }
    previous = y;
  }
  if (start !== undefined) bands.push({ top: start, bottom: previous });
  return bands;
}

function eraseInk(data: Uint8ClampedArray, width: number, height: number, box: Box, paper: Rgb) {
  const pad = 2;
  const top = Math.max(0, box.top - pad);
  const bottom = Math.min(height - 1, box.bottom + pad);
  const left = Math.max(0, box.left - pad);
  const right = Math.min(width - 1, box.right + pad);
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const color = at(data, width, x, y);
      if (isGold(color)) continue;
      const distance =
        Math.abs(color[0] - paper[0]) + Math.abs(color[1] - paper[1]) + Math.abs(color[2] - paper[2]);
      if (distance > 22) paint(data, width, x, y, paper);
    }
  }
}

function paperColor(data: Uint8ClampedArray, width: number, box: Box): Rgb {
  const colors: Rgb[] = [];
  for (let y = box.top; y <= box.bottom; y += 3) {
    for (let x = Math.max(0, box.left - 40); x < box.left; x += 3) {
      const color = at(data, width, x, y);
      if (color[0] > 230 && color[1] > 230 && color[2] > 230) colors.push(color);
    }
  }
  return average(colors, [246, 248, 252]);
}

function isFrameBlue(color: Rgb) {
  const [red, green, blue] = color;
  return blue > 140 && red < 140 && green < 190 && blue > red + 40;
}

function sampleAccent(data: Uint8ClampedArray, width: number, height: number): Rgb {
  const colors: Rgb[] = [];
  const base = Math.max(0, headerBottom(data, width) - 10);
  for (let y = base; y <= Math.min(height - 1, base + 8); y += 1) {
    for (let x = 200; x < width - 200; x += 2) {
      const color = at(data, width, x, y);
      if (isFrameBlue(color)) colors.push(color);
    }
  }
  return average(colors, [72, 125, 221]);
}

function warmAmount(color: Rgb) {
  const [red, green, blue] = color;
  if (red < 90 || red < green) return 0;
  const orange = red - blue;
  if (orange < 35) return 0;
  return Math.min(1, orange / 160);
}

function recolorRing(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  badge: { cx: number; cy: number; inner: number; outer: number },
  blue: Rgb,
) {
  const { cx, cy, inner, outer } = badge;
  const near = inner - 3;
  const far = outer + 4;
  const top = Math.max(0, Math.floor(cy - far));
  const bottom = Math.min(height - 1, Math.ceil(cy + far));
  const left = Math.max(0, Math.floor(cx - far));
  const right = Math.min(width - 1, Math.ceil(cx + far));
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const distance = Math.hypot(x - cx, y - cy);
      if (distance < near || distance > far) continue;
      const color = at(data, width, x, y);
      const amount = warmAmount(color);
      if (amount < 0.18) continue;
      if (amount > 0.72) {
        paint(data, width, x, y, blue);
        continue;
      }
      paint(data, width, x, y, [
        Math.round(color[0] * (1 - amount) + blue[0] * amount),
        Math.round(color[1] * (1 - amount) + blue[1] * amount),
        Math.round(color[2] * (1 - amount) + blue[2] * amount),
      ]);
    }
  }
}

function findFrame(data: Uint8ClampedArray, width: number, height: number) {
  const left = 1450;
  const right = 1950;
  const top = 1750;
  const bottom = Math.min(height - 1, 2200);
  const rows = new Map<number, number>();
  for (let y = top; y <= bottom; y += 1) {
    let count = 0;
    for (let x = left; x <= right; x += 1) {
      if (isFrameBlue(at(data, width, x, y))) count += 1;
    }
    if (count > 8) rows.set(y, count);
  }
  const ys = [...rows.keys()].sort((a, b) => a - b);
  if (ys.length < 10) throw new Error("Certificate template could not be read.");
  let start = ys[0];
  let previous = ys[0];
  let best = { top: ys[0], bottom: ys[0], weight: 0 };
  let weight = rows.get(ys[0]) ?? 0;
  for (const y of ys.slice(1)) {
    if (y > previous + 6) {
      if (weight > best.weight) best = { top: start, bottom: previous, weight };
      start = y;
      weight = 0;
    }
    weight += rows.get(y) ?? 0;
    previous = y;
  }
  if (weight > best.weight) best = { top: start, bottom: previous, weight };

  let minX = right;
  let maxX = left;
  for (let y = best.top; y <= best.bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      if (isFrameBlue(at(data, width, x, y))) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }
  const midY = Math.round((best.top + best.bottom) / 2);
  let thickness = 0;
  for (let x = minX; x < maxX; x += 1) {
    if (!isFrameBlue(at(data, width, x, midY))) break;
    thickness += 1;
  }
  const inset = Math.max(thickness, 4) + 2;
  return {
    outer: { left: minX, top: best.top, right: maxX, bottom: best.bottom },
    inner: {
      left: minX + inset,
      top: best.top + inset,
      right: maxX - inset,
      bottom: best.bottom - inset,
    },
  };
}

function removeVerifyMark(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  outer: Box,
  paper: Rgb,
) {
  const pad = 4;
  const top = Math.max(0, outer.top - pad);
  const bottom = Math.min(height - 1, outer.bottom + pad);
  const left = Math.max(0, outer.left - pad);
  const right = Math.min(width - 1, outer.right + pad);
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) paint(data, width, x, y, paper);
  }

  const labelLeft = Math.max(0, outer.left - 48);
  const labelRight = Math.min(width - 1, outer.right + 48);
  let labelBottom = Math.min(height - 1, outer.bottom + 150);
  for (let y = outer.bottom + 10; y < labelBottom; y += 1) {
    let dark = 0;
    for (let x = labelLeft; x <= labelRight; x += 2) {
      const [red, green, blue] = at(data, width, x, y);
      if (red < 90 && green < 100 && blue < 120) dark += 1;
    }
    if (dark > 8) {
      labelBottom = y - 6;
      break;
    }
  }
  const labelTop = Math.min(height - 1, outer.bottom + 2);
  for (let y = labelTop; y <= labelBottom; y += 1) {
    for (let x = labelLeft; x <= labelRight; x += 1) paint(data, width, x, y, paper);
  }
}

function clearFrame(data: Uint8ClampedArray, width: number, frame: Box, paper: Rgb) {
  for (let y = frame.top; y <= frame.bottom; y += 1) {
    for (let x = frame.left; x <= frame.right; x += 1) paint(data, width, x, y, paper);
  }
}

function words(text: string, weight: Run["weight"]): Run[] {
  return text
    .split(/(\s+)/)
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, weight }));
}

function trimLine(line: Run[]) {
  const next = line.slice();
  while (next.length > 0 && next[0].text.trim() === "") next.shift();
  while (next.length > 0 && next[next.length - 1].text.trim() === "") next.pop();
  return next;
}

function measureRun(context: CanvasRenderingContext2D, run: Run, size: number) {
  context.font = `${size}px ${run.weight === "bold" ? BOLD_FONT : BODY_FONT}`;
  return context.measureText(run.text).width;
}

function wrapRuns(context: CanvasRenderingContext2D, tokens: Run[], size: number, column: number) {
  const lines: Run[][] = [];
  let line: Run[] = [];
  let width = 0;
  for (const token of tokens) {
    const space = token.text.trim() === "";
    const tokenWidth = measureRun(context, token, size);
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

function lineWidth(context: CanvasRenderingContext2D, line: Run[], size: number) {
  return line.reduce((sum, run) => sum + measureRun(context, run, size), 0);
}

function drawName(
  context: CanvasRenderingContext2D,
  name: string,
  box: Box,
  color: Rgb,
) {
  const target = box.bottom - box.top + 1;
  let low = 20;
  let high = 360;
  let size = 180;
  for (let step = 0; step < 14; step += 1) {
    size = (low + high) / 2;
    context.font = `${size}px ${NAME_FONT}`;
    const measured = context.measureText(name);
    const height = measured.actualBoundingBoxAscent + measured.actualBoundingBoxDescent;
    if (height < target) low = size;
    else high = size;
  }
  size = low;
  const maxWidth = 560 * SCALE;
  context.font = `${size}px ${NAME_FONT}`;
  let width = context.measureText(name).width;
  if (width > maxWidth) {
    size *= maxWidth / width;
    context.font = `${size}px ${NAME_FONT}`;
    width = maxWidth;
  }
  const measured = context.measureText(name);
  const center = (box.left + box.right) / 2;
  const baseline = box.top + measured.actualBoundingBoxAscent;
  context.fillStyle = css(color);
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.fillText(name, center, baseline);
}

function fitBodySize(context: CanvasRenderingContext2D, target: number) {
  let low = 12;
  let high = target * 2.2;
  for (let step = 0; step < 12; step += 1) {
    const mid = (low + high) / 2;
    context.font = `${mid}px ${BODY_FONT}`;
    const measured = context.measureText("Agjpy");
    const height = measured.actualBoundingBoxAscent + measured.actualBoundingBoxDescent;
    if (height < target) low = mid;
    else high = mid;
  }
  return low;
}

function drawSentence(
  context: CanvasRenderingContext2D,
  training: string,
  block: Box,
  lineHeight: number,
  leading: number,
  regular: Rgb,
  bold: Rgb,
  limitBottom: number,
) {
  const tokens = [
    ...words(sentenceBefore, "regular"),
    ...words(training, "bold"),
    ...words(sentenceAfter, "regular"),
  ];
  const column = Math.max(420 * SCALE, block.right - block.left);
  let size = fitBodySize(context, lineHeight);
  let lines = wrapRuns(context, tokens, size, column);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const blockHeight = (lines.length - 1) * leading + lineHeight;
    const center = (block.top + block.bottom) / 2;
    if (center + blockHeight / 2 <= limitBottom || size < 30) break;
    size *= 0.92;
    leading *= 0.92;
    lines = wrapRuns(context, tokens, size, column);
  }
  const blockHeight = (lines.length - 1) * leading + lineHeight;
  const center = (block.top + block.bottom) / 2;
  const firstTop = center - blockHeight / 2;
  const midX = (block.left + block.right) / 2;
  lines.forEach((line, index) => {
    context.font = `${size}px ${BODY_FONT}`;
    const sample = context.measureText("Hg");
    const baseline = firstTop + index * leading + sample.actualBoundingBoxAscent;
    let x = midX - lineWidth(context, line, size) / 2;
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    for (const run of line) {
      context.font = `${size}px ${run.weight === "bold" ? BOLD_FONT : BODY_FONT}`;
      context.fillStyle = css(run.weight === "bold" ? bold : regular);
      context.fillText(run.text, x, baseline);
      x += measureRun(context, run, size);
    }
  });
}

function drawQr(
  context: CanvasRenderingContext2D,
  url: string,
  frame: Box,
  color: Rgb,
) {
  const matrix = qrMatrix(url.trim());
  const count = matrix.length;
  let quiet = 4;
  let cellSize = 0;
  const innerW = frame.right - frame.left;
  const innerH = frame.bottom - frame.top;
  while (quiet >= 0) {
    cellSize = Math.floor(Math.min(innerW, innerH) / (count + quiet * 2));
    if (cellSize >= 3 || quiet === 0) break;
    quiet -= 1;
  }
  if (cellSize < 1) cellSize = 1;
  const drawn = cellSize * count;
  const originX = Math.round(frame.left + (innerW - drawn) / 2);
  const originY = Math.round(frame.top + (innerH - drawn) / 2);
  context.fillStyle = css(color);
  for (let y = 0; y < count; y += 1) {
    for (let x = 0; x < count; x += 1) {
      if (!matrix[y][x]) continue;
      context.fillRect(originX + x * cellSize, originY + y * cellSize, cellSize, cellSize);
    }
  }
}

async function loadBitmap(bytes: Uint8Array, type: string) {
  const blob = new Blob([Uint8Array.from(bytes)], { type });
  return createImageBitmap(blob);
}

export async function composeNewCertificate(
  jpeg: Uint8Array,
  values: CertificateValues,
  logo?: Uint8Array,
) {
  await Promise.all([
    loadFont(NAME_FONT, "/fonts/Poppins-Bold.ttf"),
    loadFont(BODY_FONT, "/fonts/Poppins-Medium.ttf"),
  ]);

  const bitmap = await loadBitmap(jpeg, "image/jpeg");
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("The certificate could not be prepared.");
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const width = canvas.width;
  const height = canvas.height;
  const image = context.getImageData(0, 0, width, height);
  const { data } = image;
  const badge = findBadge(data, width, height);
  const accent = sampleAccent(data, width, height);
  clearBadge(data, width, height, badge, Boolean(logo));
  if (logo) recolorRing(data, width, height, badge, accent);

  const name = values.candidateName.trim();
  const training = certificateTraining(values.trainingName);
  const nameInk = inkBox(data, width, height, { left: 700, top: 1220, right: 2700, bottom: 1500 });
  const bodyBounds = { left: 400, top: 1520, right: 3000, bottom: 1800 };
  const bodyInk = training ? inkBox(data, width, height, bodyBounds) : null;
  const bands = training ? rowBands(data, width, bodyBounds) : [];
  const frame = findFrame(data, width, height);

  const paper = paperColor(data, width, { left: 900, top: 1280, right: 1100, bottom: 1400 });
  const darker: Rgb[] = [];
  const lighter: Rgb[] = [];
  if (bodyInk) {
    for (let y = bodyInk.box.top; y <= bodyInk.box.bottom; y += 2) {
      for (let x = bodyInk.box.left; x <= bodyInk.box.right; x += 3) {
        const color = at(data, width, x, y);
        if (!isInk(color)) continue;
        const tone = color[0] + color[1] + color[2];
        if (tone < 220) darker.push(color);
        else lighter.push(color);
      }
    }
  }
  if (name && nameInk) eraseInk(data, width, height, nameInk.box, paper);
  if (bodyInk) eraseInk(data, width, height, bodyInk.box, paperColor(data, width, bodyInk.box));

  const linked = isHttpUrl(values.certificateUrl);
  const beside = at(
    data,
    width,
    Math.max(0, frame.outer.left - 28),
    Math.round((frame.outer.top + frame.outer.bottom) / 2),
  );
  if (linked) clearFrame(data, width, frame.inner, [255, 255, 255]);
  else removeVerifyMark(data, width, height, frame.outer, beside);
  context.putImageData(image, 0, 0);

  if (logo) {
    const logoBitmap = await loadBitmap(logo, "image/png");
    const radius = badge.inner * 0.78;
    context.save();
    context.beginPath();
    context.arc(badge.cx, badge.cy, radius, 0, Math.PI * 2);
    context.clip();
    context.drawImage(logoBitmap, badge.cx - radius, badge.cy - radius, radius * 2, radius * 2);
    context.restore();
    logoBitmap.close();
  }

  if (name && nameInk) drawName(context, name, nameInk.box, nameInk.color);
  if (training && bodyInk && bands.length > 0) {
    const lineHeight = bands[0].bottom - bands[0].top + 1;
    const leading =
      bands.length > 1 ? bands[1].top - bands[0].top : Math.round(lineHeight * 1.45);
    drawSentence(
      context,
      training,
      bodyInk.box,
      lineHeight,
      leading,
      average(lighter, [78, 92, 118]),
      average(darker, [22, 32, 52]),
      frame.outer.top - 10,
    );
  }

  if (linked) drawQr(context, values.certificateUrl, frame.inner, [15, 23, 48]);

  const png = await new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("The certificate could not be prepared."));
        return;
      }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, "image/png");
  });
  return png;
}
