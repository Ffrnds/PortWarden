#!/usr/bin/env node
// One-time dev tool: renders a simplified, pixel-accurate version of
// apps/web/assets/logo.svg (hexagon core + 3 satellite dots + connecting
// lines) into a real PNG, using nothing but node:zlib for the deflate step.
// No image library, no Electron GUI needed (that can't run headless in some
// environments) — just per-pixel math and a hand-built PNG file.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const SIZE = 256;
const SCALE = SIZE / 240; // logo.svg's viewBox is 240x240

const CYAN = [0x35, 0xf2, 0xff];
const MAGENTA = [0xff, 0x33, 0x99];
const VOID_DARK = [0x0a, 0x0e, 0x1c];

const CENTER = [120, 120];
const HEX_POINTS = [
  [120, 65],
  [167.6, 92.5],
  [167.6, 147.5],
  [120, 175],
  [72.4, 147.5],
  [72.4, 92.5],
];
const STARS = [
  { pos: [120, 25], color: CYAN },
  { pos: [202.3, 167.5], color: MAGENTA },
  { pos: [37.7, 167.5], color: MAGENTA },
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

function distanceToSegment(px, py, [x1, y1], [x2, y2]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  let t = lengthSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  return { distance: Math.hypot(px - closestX, py - closestY), t };
}

function pointInPolygon(px, py, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const intersects = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function blendOver(dst, src) {
  const outA = src[3] + dst[3] * (1 - src[3]);
  if (outA === 0) return [0, 0, 0, 0];
  const blend = (i) => (src[i] * src[3] + dst[i] * dst[3] * (1 - src[3])) / outA;
  return [blend(0), blend(1), blend(2), outA];
}

function glow([cx, cy], color, coreRadius, glowRadius, px, py) {
  const d = Math.hypot(px - cx, py - cy);
  if (d <= coreRadius) return [...color, 1];
  if (d >= glowRadius) return [0, 0, 0, 0];
  const alpha = 0.85 * (1 - (d - coreRadius) / (glowRadius - coreRadius));
  return [...color, Math.max(0, alpha)];
}

function pixelColor(xNorm, yNorm) {
  // Work in the original 240x240 coordinate space, scale coordinates in.
  const x = xNorm / SCALE;
  const y = yNorm / SCALE;

  let pixel = [0, 0, 0, 0];

  // Thin lines from the core to each satellite star.
  STARS.forEach((star) => {
    const { distance } = distanceToSegment(x, y, CENTER, star.pos);
    if (distance < 0.6) {
      pixel = blendOver(pixel, [...star.color, 0.55 * (1 - distance / 0.6)]);
    }
  });

  // Hexagon: dark fill + gradient stroke (cyan top-left -> magenta bottom-right).
  if (pointInPolygon(x, y, HEX_POINTS)) {
    pixel = blendOver(pixel, [...VOID_DARK, 1]);
  }
  for (let i = 0; i < HEX_POINTS.length; i += 1) {
    const a = HEX_POINTS[i];
    const b = HEX_POINTS[(i + 1) % HEX_POINTS.length];
    const { distance, t } = distanceToSegment(x, y, a, b);
    if (distance < 3) {
      const gradT = (a[0] + a[1] * 0.3 + (b[0] + b[1] * 0.3 - (a[0] + a[1] * 0.3)) * t) / 300;
      const strokeColor = lerpColor(CYAN, MAGENTA, Math.max(0, Math.min(1, gradT)));
      pixel = blendOver(pixel, [...strokeColor, Math.max(0, 1 - distance / 3)]);
    }
  }

  // Satellite stars, each with a soft glow.
  STARS.forEach((star) => {
    pixel = blendOver(pixel, glow(star.pos, star.color, 5, 12, x, y));
  });

  // Core dot, with glow.
  pixel = blendOver(pixel, glow(CENTER, CYAN, 8, 18, x, y));

  return pixel;
}

function buildRawImage() {
  const raw = Buffer.alloc(SIZE * (1 + SIZE * 4));
  let offset = 0;

  for (let py = 0; py < SIZE; py += 1) {
    raw[offset] = 0; // filter type: None
    offset += 1;
    for (let px = 0; px < SIZE; px += 1) {
      const [r, g, b, a] = pixelColor(px + 0.5, py + 0.5);
      raw[offset] = Math.round(r);
      raw[offset + 1] = Math.round(g);
      raw[offset + 2] = Math.round(b);
      raw[offset + 3] = Math.round(a * 255);
      offset += 4;
    }
  }

  return raw;
}

const CRC_TABLE = (() => {
  const table = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function buildPng() {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(SIZE, 0);
  ihdrData.writeUInt32BE(SIZE, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const raw = buildRawImage();
  const idatData = zlib.deflateSync(raw);

  return Buffer.concat([signature, chunk('IHDR', ihdrData), chunk('IDAT', idatData), chunk('IEND', Buffer.alloc(0))]);
}

const outPath = path.join(__dirname, '../apps/desktop/build/icon.png');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, buildPng());
console.log(`Wrote ${outPath}`);
