#!/usr/bin/env node
/**
 * Generates tray icon PNGs for macOS menu bar.
 * Creates template images (monochrome black on transparent) with optional colored status dots.
 *
 * Template images on macOS: the system automatically inverts them for dark mode.
 * The "Template" suffix in the filename tells macOS to treat them as template images.
 */

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const OUTPUT_DIR = path.join(__dirname, '..', 'resources', 'tray')

// CRC32 table for PNG chunks
const crcTable = []
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  crcTable[n] = c
}

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function createPNGChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const crcData = Buffer.concat([typeBytes, data])
  const crcVal = Buffer.alloc(4)
  crcVal.writeUInt32BE(crc32(crcData), 0)
  return Buffer.concat([length, typeBytes, data, crcVal])
}

function createPNG(width, height, pixelData) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  // IDAT - raw pixel data with filter bytes
  const rawData = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0 // filter: none
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4
      const dstIdx = y * (1 + width * 4) + 1 + x * 4
      rawData[dstIdx] = pixelData[srcIdx]     // R
      rawData[dstIdx + 1] = pixelData[srcIdx + 1] // G
      rawData[dstIdx + 2] = pixelData[srcIdx + 2] // B
      rawData[dstIdx + 3] = pixelData[srcIdx + 3] // A
    }
  }
  const compressed = zlib.deflateSync(rawData)

  // IEND
  const iend = Buffer.alloc(0)

  return Buffer.concat([
    signature,
    createPNGChunk('IHDR', ihdr),
    createPNGChunk('IDAT', compressed),
    createPNGChunk('IEND', iend),
  ])
}

// Draw a slash "/" character on a canvas
function drawSlash(pixels, width, height, color) {
  const [r, g, b, a] = color
  // Draw a diagonal line from bottom-left to top-right
  // Slash occupies roughly the center area
  const margin = Math.round(width * 0.2)
  const lineWidth = Math.max(1, Math.round(width * 0.15))

  for (let y = 0; y < height; y++) {
    // Map y to x: as y goes from 0 (top) to height-1 (bottom), x goes from right to left
    const progress = y / (height - 1)
    const centerX = Math.round(margin + (1 - progress) * (width - 2 * margin))

    for (let dx = -Math.floor(lineWidth / 2); dx <= Math.floor(lineWidth / 2); dx++) {
      const x = centerX + dx
      if (x >= 0 && x < width) {
        const idx = (y * width + x) * 4
        pixels[idx] = r
        pixels[idx + 1] = g
        pixels[idx + 2] = b
        pixels[idx + 3] = a
      }
    }
  }
}

// Draw a small colored dot in the bottom-right corner
function drawDot(pixels, width, height, color) {
  const [r, g, b] = color
  const dotRadius = Math.max(2, Math.round(width * 0.15))
  const cx = width - dotRadius - 1
  const cy = height - dotRadius - 1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      if (dist <= dotRadius) {
        const idx = (y * width + x) * 4
        // Anti-aliasing at the edge
        const alpha = dist > dotRadius - 1 ? Math.round(255 * (dotRadius - dist)) : 255
        pixels[idx] = r
        pixels[idx + 1] = g
        pixels[idx + 2] = b
        pixels[idx + 3] = Math.max(0, alpha)
      }
    }
  }
}

function generateIcon(size, dotColor) {
  const pixels = Buffer.alloc(size * size * 4, 0) // transparent

  // Draw black slash (template image - macOS will colorize automatically)
  drawSlash(pixels, size, size, [0, 0, 0, 200])

  // Draw colored status dot if specified
  if (dotColor) {
    drawDot(pixels, size, size, dotColor)
  }

  return createPNG(size, size, pixels)
}

// Generate all variants
const variants = [
  { suffix: '', dot: null },
  { suffix: '-green', dot: [52, 211, 153] },   // emerald/green
  { suffix: '-orange', dot: [251, 146, 60] },   // amber/orange
  { suffix: '-red', dot: [248, 113, 113] },      // red
]

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

for (const variant of variants) {
  // 16x16 (1x)
  const png16 = generateIcon(16, variant.dot)
  fs.writeFileSync(path.join(OUTPUT_DIR, `trayTemplate${variant.suffix}.png`), png16)

  // 32x32 (2x)
  const png32 = generateIcon(32, variant.dot)
  fs.writeFileSync(path.join(OUTPUT_DIR, `trayTemplate${variant.suffix}@2x.png`), png32)
}

console.log('Tray icons generated in', OUTPUT_DIR)
