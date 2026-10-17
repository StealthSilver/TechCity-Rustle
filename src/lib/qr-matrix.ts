// QR Code, byte mode, error correction M, versions 1–7.
// Enough for a certificate link of up to 122 characters.

type Version = {
  version: number;
  size: number;
  ecc: number;
  blocks: Array<[count: number, data: number]>;
  alignment: number[];
};

const VERSIONS: Version[] = [
  { version: 1, size: 21, ecc: 10, blocks: [[1, 16]], alignment: [] },
  { version: 2, size: 25, ecc: 16, blocks: [[1, 28]], alignment: [6, 18] },
  { version: 3, size: 29, ecc: 26, blocks: [[1, 44]], alignment: [6, 22] },
  { version: 4, size: 33, ecc: 18, blocks: [[2, 32]], alignment: [6, 26] },
  { version: 5, size: 37, ecc: 24, blocks: [[2, 43]], alignment: [6, 30] },
  { version: 6, size: 41, ecc: 16, blocks: [[4, 27]], alignment: [6, 34] },
  { version: 7, size: 45, ecc: 18, blocks: [[4, 31]], alignment: [6, 22, 38] },
];

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

let value = 1;
for (let i = 0; i < 255; i += 1) {
  EXP[i] = value;
  LOG[value] = i;
  value <<= 1;
  if (value & 0x100) value ^= 0x11d;
}
for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];

function mul(a: number, b: number) {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function rsGenerator(nsym: number) {
  let poly = [1];
  for (let i = 0; i < nsym; i += 1) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= mul(poly[j], EXP[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly.reverse();
}

function rsRemainder(data: number[], nsym: number) {
  const generator = rsGenerator(nsym);
  const result = data.concat(new Array<number>(nsym).fill(0));
  for (let i = 0; i < data.length; i += 1) {
    const coef = result[i];
    if (coef === 0) continue;
    for (let j = 0; j < generator.length; j += 1) {
      result[i + j] ^= mul(generator[j], coef);
    }
  }
  return result.slice(data.length);
}

function byteCapacity(version: Version) {
  const dataCodewords = version.blocks.reduce((sum, [count, data]) => sum + count * data, 0);
  return Math.floor((dataCodewords * 8 - 4 - 8) / 8);
}

class BitBuffer {
  bytes: number[] = [];
  length = 0;

  push(value: number, width: number) {
    for (let i = width - 1; i >= 0; i -= 1) {
      const index = this.length >> 3;
      if (this.bytes[index] === undefined) this.bytes[index] = 0;
      this.bytes[index] |= ((value >> i) & 1) << (7 - (this.length & 7));
      this.length += 1;
    }
  }
}

function dataCodewords(text: Uint8Array, version: Version) {
  const capacity = version.blocks.reduce((sum, [count, data]) => sum + count * data, 0);
  const bits = new BitBuffer();
  bits.push(0b0100, 4);
  bits.push(text.length, 8);
  for (const byte of text) bits.push(byte, 8);
  const terminator = Math.min(4, capacity * 8 - bits.length);
  if (terminator > 0) bits.push(0, terminator);
  if (bits.length % 8 !== 0) bits.push(0, 8 - (bits.length % 8));
  const pads = [0xec, 0x11];
  let pad = 0;
  while (bits.bytes.length < capacity) {
    bits.bytes.push(pads[pad]);
    pad ^= 1;
  }
  return bits.bytes;
}

function interleave(version: Version, data: number[]) {
  const blocks: number[][] = [];
  let offset = 0;
  for (const [count, length] of version.blocks) {
    for (let i = 0; i < count; i += 1) {
      blocks.push(data.slice(offset, offset + length));
      offset += length;
    }
  }
  const ecc = blocks.map((block) => rsRemainder(block, version.ecc));
  const out: number[] = [];
  const maxData = Math.max(...blocks.map((block) => block.length));
  for (let i = 0; i < maxData; i += 1) {
    for (const block of blocks) if (i < block.length) out.push(block[i]);
  }
  for (let i = 0; i < version.ecc; i += 1) {
    for (const block of ecc) out.push(block[i]);
  }
  return out;
}

function drawFinder(modules: boolean[][], reserved: boolean[][], row: number, col: number) {
  const size = modules.length;
  for (let y = -1; y <= 7; y += 1) {
    for (let x = -1; x <= 7; x += 1) {
      const yy = row + y;
      const xx = col + x;
      if (yy < 0 || xx < 0 || yy >= size || xx >= size) continue;
      const inside = y >= 0 && y <= 6 && x >= 0 && x <= 6;
      const edge = y === 0 || y === 6 || x === 0 || x === 6;
      const core = y >= 2 && y <= 4 && x >= 2 && x <= 4;
      modules[yy][xx] = inside && (edge || core);
      reserved[yy][xx] = true;
    }
  }
}

function drawAlignment(modules: boolean[][], reserved: boolean[][], cx: number, cy: number) {
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      modules[cy + y][cx + x] = Math.max(Math.abs(y), Math.abs(x)) !== 1;
      reserved[cy + y][cx + x] = true;
    }
  }
}

function formatBits(mask: number) {
  const data = mask;
  let bits = data << 10;
  for (let i = 4; i >= 0; i -= 1) {
    if ((bits >>> (i + 10)) & 1) bits ^= 0x537 << i;
  }
  return ((data << 10) | (bits & 0x3ff)) ^ 0x5412;
}

function versionBits(version: number) {
  let bits = version << 12;
  for (let i = 5; i >= 0; i -= 1) {
    if ((bits >>> (i + 12)) & 1) bits ^= 0x1f25 << i;
  }
  return (version << 12) | (bits & 0xfff);
}

function reserveFormat(reserved: boolean[][]) {
  const size = reserved.length;
  for (let i = 0; i < 15; i += 1) {
    const row = i < 6 ? i : i < 8 ? i + 1 : size - 15 + i;
    reserved[row][8] = true;
    const col = i < 8 ? size - i - 1 : i < 9 ? 7 : 14 - i;
    reserved[8][col] = true;
  }
  reserved[size - 8][8] = true;
}

function writeFormat(modules: boolean[][], mask: number) {
  const size = modules.length;
  const bits = formatBits(mask);
  for (let i = 0; i < 15; i += 1) {
    const bit = ((bits >> i) & 1) === 1;
    const row = i < 6 ? i : i < 8 ? i + 1 : size - 15 + i;
    modules[row][8] = bit;
    const col = i < 8 ? size - i - 1 : i < 9 ? 7 : 14 - i;
    modules[8][col] = bit;
  }
  modules[size - 8][8] = true;
}

function writeVersion(modules: boolean[][], reserved: boolean[][], version: number) {
  if (version < 7) return;
  const size = modules.length;
  const bits = versionBits(version);
  for (let i = 0; i < 18; i += 1) {
    const bit = ((bits >> i) & 1) === 1;
    const a = Math.floor(i / 3);
    const b = (i % 3) + size - 11;
    modules[a][b] = bit;
    reserved[a][b] = true;
    modules[b][a] = bit;
    reserved[b][a] = true;
  }
}

function placeData(modules: boolean[][], reserved: boolean[][], codewords: number[]) {
  const size = modules.length;
  let bit = 0;
  const total = codewords.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert += 1) {
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (reserved[y][x] || bit >= total) continue;
        const byte = codewords[bit >> 3];
        modules[y][x] = ((byte >> (7 - (bit & 7))) & 1) === 1;
        bit += 1;
      }
    }
  }
}

function maskBit(mask: number, row: number, col: number) {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    default:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

function penalty(modules: boolean[][]) {
  const size = modules.length;
  let score = 0;

  const run = (dark: boolean, length: number) => {
    if (length >= 5) score += 3 + (length - 5);
    return dark;
  };

  for (let y = 0; y < size; y += 1) {
    let dark = modules[y][0];
    let length = 1;
    for (let x = 1; x < size; x += 1) {
      if (modules[y][x] === dark) length += 1;
      else {
        run(dark, length);
        dark = modules[y][x];
        length = 1;
      }
    }
    run(dark, length);
  }
  for (let x = 0; x < size; x += 1) {
    let dark = modules[0][x];
    let length = 1;
    for (let y = 1; y < size; y += 1) {
      if (modules[y][x] === dark) length += 1;
      else {
        run(dark, length);
        dark = modules[y][x];
        length = 1;
      }
    }
    run(dark, length);
  }

  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const bit = modules[y][x];
      if (bit === modules[y][x + 1] && bit === modules[y + 1][x] && bit === modules[y + 1][x + 1]) {
        score += 3;
      }
    }
  }

  const finder = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const finderFlip = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  const matches = (cells: boolean[], index: number, pattern: number[]) => {
    for (let i = 0; i < pattern.length; i += 1) {
      if (cells[index + i] !== (pattern[i] === 1)) return false;
    }
    return true;
  };
  for (let i = 0; i < size; i += 1) {
    const row = modules[i];
    const col = modules.map((line) => line[i]);
    for (let x = 0; x <= size - finder.length; x += 1) {
      if (matches(row, x, finder) || matches(row, x, finderFlip)) score += 40;
      if (matches(col, x, finder) || matches(col, x, finderFlip)) score += 40;
    }
  }

  let dark = 0;
  for (const row of modules) for (const cell of row) if (cell) dark += 1;
  score += Math.floor(Math.abs((dark * 100) / (size * size) - 50) / 5) * 10;
  return score;
}

export function qrMatrix(text: string) {
  const bytes = new TextEncoder().encode(text);
  const version = VERSIONS.find((item) => byteCapacity(item) >= bytes.length);
  if (!version) {
    throw new Error("The certificate link is too long for a QR code.");
  }

  const codewords = interleave(version, dataCodewords(bytes, version));
  const size = version.size;
  const modules = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const reserved = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  drawFinder(modules, reserved, 0, 0);
  drawFinder(modules, reserved, 0, size - 7);
  drawFinder(modules, reserved, size - 7, 0);
  for (let i = 8; i < size - 8; i += 1) {
    const dark = i % 2 === 0;
    modules[6][i] = dark;
    reserved[6][i] = true;
    modules[i][6] = dark;
    reserved[i][6] = true;
  }
  for (const cy of version.alignment) {
    for (const cx of version.alignment) {
      const overlapsFinder =
        (cx < 9 && cy < 9) || (cx > size - 10 && cy < 9) || (cx < 9 && cy > size - 10);
      if (overlapsFinder) continue;
      drawAlignment(modules, reserved, cx, cy);
    }
  }
  reserveFormat(reserved);
  writeVersion(modules, reserved, version.version);
  placeData(modules, reserved, codewords);

  let best: boolean[][] | null = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = modules.map((row) => row.slice());
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (!reserved[y][x] && maskBit(mask, y, x)) candidate[y][x] = !candidate[y][x];
      }
    }
    writeFormat(candidate, mask);
    const score = penalty(candidate);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best ?? modules;
}
