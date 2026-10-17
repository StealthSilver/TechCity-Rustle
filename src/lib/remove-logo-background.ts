const MAX_SIDE = 800;
const OUTPUT_SIZE = 640;
const MATCH = 36;
const FRINGE = 58;

function channelDistance(
  data: Uint8ClampedArray,
  index: number,
  red: number,
  green: number,
  blue: number,
) {
  return Math.max(
    Math.abs(data[index] - red),
    Math.abs(data[index + 1] - green),
    Math.abs(data[index + 2] - blue),
  );
}

function backgroundColor(data: Uint8ClampedArray, width: number, height: number) {
  const points = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height - 1) * width + (width - 1)) * 4,
  ];
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  for (const index of points) {
    if (data[index + 3] < 16) continue;
    red += data[index];
    green += data[index + 1];
    blue += data[index + 2];
    count += 1;
  }
  if (count === 0) return null;
  return {
    red: Math.round(red / count),
    green: Math.round(green / count),
    blue: Math.round(blue / count),
  };
}

function clearBackground(image: ImageData) {
  const { data, width, height } = image;
  const background = backgroundColor(data, width, height);
  if (!background) return;

  const original = new Uint8ClampedArray(data);
  const { red, green, blue } = background;
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const push = (pixel: number) => {
    if (seen[pixel]) return;
    const index = pixel * 4;
    if (data[index + 3] < 16) {
      seen[pixel] = 1;
      return;
    }
    if (channelDistance(data, index, red, green, blue) > MATCH) return;
    seen[pixel] = 1;
    queue[tail] = pixel;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    push(y * width);
    push(y * width + (width - 1));
  }

  while (head < tail) {
    const pixel = queue[head];
    head += 1;
    data[pixel * 4 + 3] = 0;
    const x = pixel % width;
    const y = (pixel - x) / width;
    if (x > 0) push(pixel - 1);
    if (x + 1 < width) push(pixel + 1);
    if (y > 0) push(pixel - width);
    if (y + 1 < height) push(pixel + width);
  }

  let removed = 0;
  for (let pixel = 0; pixel < seen.length; pixel += 1) {
    if (data[pixel * 4 + 3] === 0) removed += 1;
  }
  if (removed / seen.length > 0.92) {
    data.set(original);
    return;
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = (y * width + x) * 4;
      if (data[index + 3] < 16) continue;
      const distance = channelDistance(data, index, red, green, blue);
      if (distance > FRINGE) continue;
      const neighbors = [index - 4, index + 4, index - width * 4, index + width * 4];
      if (!neighbors.some((neighbor) => data[neighbor + 3] === 0)) continue;
      const fade = (distance - MATCH) / (FRINGE - MATCH);
      data[index + 3] = fade <= 0 ? 0 : Math.round(data[index + 3] * fade);
    }
  }
}

function trimTransparent(image: ImageData) {
  const { data, width, height } = image;
  let top = height;
  let left = width;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] < 12) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < left || bottom < top) return image;

  const trimmedWidth = right - left + 1;
  const trimmedHeight = bottom - top + 1;
  const canvas = document.createElement("canvas");
  canvas.width = trimmedWidth;
  canvas.height = trimmedHeight;
  const context = canvas.getContext("2d");
  if (!context) return image;
  const trimmed = context.createImageData(trimmedWidth, trimmedHeight);
  for (let y = 0; y < trimmedHeight; y += 1) {
    const source = ((top + y) * width + left) * 4;
    trimmed.data.set(data.subarray(source, source + trimmedWidth * 4), y * trimmedWidth * 4);
  }
  context.putImageData(trimmed, 0, 0);
  return context.getImageData(0, 0, trimmedWidth, trimmedHeight);
}

function squarePng(image: ImageData) {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The logo could not be prepared.");
  const source = document.createElement("canvas");
  source.width = image.width;
  source.height = image.height;
  const sourceContext = source.getContext("2d");
  if (!sourceContext) throw new Error("The logo could not be prepared.");
  sourceContext.putImageData(image, 0, 0);
  const scale = Math.min(OUTPUT_SIZE / image.width, OUTPUT_SIZE / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  context.drawImage(source, (OUTPUT_SIZE - width) / 2, (OUTPUT_SIZE - height) / 2, width, height);
  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("The logo could not be prepared."));
        return;
      }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, "image/png");
  });
}

export async function removeLogoBackground(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("The logo could not be prepared.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const image = context.getImageData(0, 0, width, height);
  clearBackground(image);
  return squarePng(trimTransparent(image));
}
