#!/usr/bin/env node
// One-time dev tool: renders a bold, simplified version of
// apps/web/assets/logo.svg (hexagon + core dot) into a real PNG, using
// nothing but node:zlib for the deflate step. No image library, no
// Electron GUI needed (that can't run headless in some environments) —
// just per-pixel math and a hand-built PNG file.
//
// This is deliberately NOT a faithful full-detail reproduction of the logo
// (no thin connecting lines, no satellite dots, no soft glow) — those read
// fine at logo size but disappear into mush at a 24-32px taskbar/tray icon.
// Bold shapes, high contrast, big fill factor: that's what stays legible
// small.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const SIZE = 256;
const CENTER = [SIZE / 2, SIZE / 2];

const CYAN = [0x35, 0xf2, 0xff];
const MAGENTA = [0xff, 0x33, 0x99];
const VOID_DARK = [0x0a, 0x0e, 0x1c];

// Hexagon scaled up to fill almost the whole canvas (logo.svg's own hexagon
// only fills the middle ~46% of its viewBox — fine for a large logo, too
// small to read once shrunk to icon size).
const HEX_RADIUS = SIZE * 0.46;
const HEX_POINTS = [0, 60, 120, 180, 240, 300].map((angleDeg) => {
  const angle = ((angleDeg - 90) * Math.PI) / 180;
  return [CENTER[0] + HEX_RADIUS * Math.cos(angle), CENTER[1] + HEX_RADIUS * Math.sin(angle)];
});

const STROKE_WIDTH = SIZE * 0.045;
const CORE_RADIUS = SIZE * 0.16;

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
  return { distance: Math.hypot(px - closestX, py - closestY) };
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

// Antialiasing: a soft 1px falloff at shape edges instead of a hard cutoff,
// so the icon doesn't look jagged when Windows scales it down.
function edgeAlpha(signedDistance) {
  return Math.max(0, Math.min(1, 0.5 - signedDistance));
}

function pixelColor(px, py) {
  let pixel = [0, 0, 0, 0];

  const distToCore = Math.hypot(px - CENTER[0], py - CENTER[1]) - CORE_RADIUS;
  const coreAlpha = edgeAlpha(distToCore);

  const inside = pointInPolygon(px, py, HEX_POINTS);
  let minStrokeDist = Infinity;
  let strokeGradT = 0;
  for (let i = 0; i < HEX_POINTS.length; i += 1) {
    const a = HEX_POINTS[i];
    const b = HEX_POINTS[(i + 1) % HEX_POINTS.length];
    const { distance } = distanceToSegment(px, py, a, b);
    if (distance < minStrokeDist) {
      minStrokeDist = distance;
      strokeGradT = (a[0] + a[1]) / (SIZE * 2);
    }
  }

  if (inside) {
    pixel = blendOver(pixel, [...VOID_DARK, 1]);
  }

  const strokeAlpha = edgeAlpha(minStrokeDist - STROKE_WIDTH);
  if (strokeAlpha > 0) {
    const strokeColor = lerpColor(CYAN, MAGENTA, Math.max(0, Math.min(1, strokeGradT)));
    pixel = blendOver(pixel, [...strokeColor, strokeAlpha]);
  }

  if (coreAlpha > 0) {
    pixel = blendOver(pixel, [...CYAN, coreAlpha]);
  }

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
