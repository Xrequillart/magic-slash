#!/usr/bin/env node
/**
 * Generates tray icon PNGs for the macOS menu bar.
 * Creates template images (black on transparent) with optional status dots.
 *
 * Template images on macOS: the system automatically inverts them for dark mode.
 * The "Template" suffix in the filename tells macOS to treat them as template images.
 *
 * The mark is the rabbit from `assets/rabbit-tray-source.png`, scaled down to menu bar
 * size. Only that source's ALPHA is read: the shape comes from its coverage and the RGB
 * it ships with is irrelevant, so each variant below paints its own.
 *
 * A template variant is painted black and macOS re-tints it, which is what keeps it
 * legible on a light or a dark bar — and also what makes a colour pointless there. This
 * used to emit one template per aggregate state (`-green`, `-orange`, `-red`), three
 * files that differed by a suffix and by nothing else; they are one file now. Only
 * `trayQuestion` ships a real colour, and it pays for it by being fixed in both bars.
 *
 * No image library: the desktop app has none, so this file carries a small PNG reader
 * and writer. Run it by hand after changing the source art:
 *   node scripts/generate-tray-icons.js
 */

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const OUTPUT_DIR = path.join(__dirname, '..', 'resources', 'tray')
const SOURCE = path.join(__dirname, 'assets', 'rabbit-tray-source.png')

/**
 * Menu bar geometry, in 1x pixels. The canvas is wider than it is tall because the
 * rabbit is a landscape mark (~1.47:1) — squeezing it into a square would waste the
 * height the menu bar actually gives us and leave the rabbit tiny.
 */
const CANVAS_W = 22
const CANVAS_H = 16
const PADDING = 1        // clear space around the mark, so it does not touch the edges
const DOT_RADIUS = 0.15  // as a fraction of canvas height

// ── PNG writing ──────────────────────────────────────────────────────────────

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
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  const rawData = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0 // filter: none
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4
      const dstIdx = y * (1 + width * 4) + 1 + x * 4
      rawData[dstIdx] = pixelData[srcIdx]
      rawData[dstIdx + 1] = pixelData[srcIdx + 1]
      rawData[dstIdx + 2] = pixelData[srcIdx + 2]
      rawData[dstIdx + 3] = pixelData[srcIdx + 3]
    }
  }
  const compressed = zlib.deflateSync(rawData)

  return Buffer.concat([
    signature,
    createPNGChunk('IHDR', ihdr),
    createPNGChunk('IDAT', compressed),
    createPNGChunk('IEND', Buffer.alloc(0)),
  ])
}

// ── PNG reading (alpha channel only) ─────────────────────────────────────────

/** Bytes per pixel for the colour types that carry an alpha channel. */
const ALPHA_BPP = { 4: 2, 6: 4 }

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  return pb <= pc ? b : c
}

/**
 * Returns { width, height, alpha } where `alpha` is one byte per pixel.
 * Deliberately narrow: 8-bit, non-interlaced, and a colour type that has alpha. A
 * silhouette without an alpha channel would carry no shape, so refusing is better than
 * silently emitting a filled rectangle.
 */
function readAlpha(file) {
  const buf = fs.readFileSync(file)
  const sig = [137, 80, 78, 71, 13, 10, 26, 10]
  for (let i = 0; i < sig.length; i++) {
    if (buf[i] !== sig[i]) throw new Error(`${file}: not a PNG`)
  }

  let width = 0
  let height = 0
  let bitDepth = 0
  let colourType = 0
  const idat = []

  let off = 8
  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    const data = buf.subarray(off + 8, off + 8 + len)

    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colourType = data[9]
      if (data[12] !== 0) throw new Error(`${file}: interlaced PNGs are not supported`)
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') {
      break
    }

    off += 8 + len + 4 // length + type + data + crc
  }

  if (bitDepth !== 8) throw new Error(`${file}: expected 8-bit, got ${bitDepth}`)
  const bpp = ALPHA_BPP[colourType]
  if (!bpp) {
    throw new Error(`${file}: colour type ${colourType} has no alpha channel; ` +
      'export the mark as RGBA (type 6) or grey+alpha (type 4)')
  }

  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = width * bpp
  const alpha = Buffer.alloc(width * height)
  const line = Buffer.alloc(stride)
  const prev = Buffer.alloc(stride)

  let p = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[p++]
    raw.copy(line, 0, p, p + stride)
    p += stride

    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0
      const b = prev[i]
      const c = i >= bpp ? prev[i - bpp] : 0
      switch (filter) {
        case 0: break
        case 1: line[i] = (line[i] + a) & 0xff; break
        case 2: line[i] = (line[i] + b) & 0xff; break
        case 3: line[i] = (line[i] + ((a + b) >> 1)) & 0xff; break
        case 4: line[i] = (line[i] + paeth(a, b, c)) & 0xff; break
        default: throw new Error(`${file}: unknown filter ${filter} on row ${y}`)
      }
    }

    // Alpha is the last byte of each pixel for both supported colour types.
    for (let x = 0; x < width; x++) {
      alpha[y * width + x] = line[x * bpp + bpp - 1]
    }
    line.copy(prev)
  }

  return { width, height, alpha }
}

// ── Drawing ──────────────────────────────────────────────────────────────────

/**
 * Box-filter the source alpha into a `dw` x `dh` rect at (ox, oy). Averaging over the
 * whole source rect per output pixel is what keeps the rabbit's thin motion streaks
 * from breaking up at menu bar size — the scale factor here is ~60x down.
 */
function drawMark(pixels, canvasW, canvasH, src, ox, oy, dw, dh, colour) {
  for (let y = 0; y < dh; y++) {
    const sy0 = (y / dh) * src.height
    const sy1 = ((y + 1) / dh) * src.height
    const y0 = Math.floor(sy0)
    const y1 = Math.min(src.height, Math.max(y0 + 1, Math.ceil(sy1)))

    for (let x = 0; x < dw; x++) {
      const sx0 = (x / dw) * src.width
      const sx1 = ((x + 1) / dw) * src.width
      const x0 = Math.floor(sx0)
      const x1 = Math.min(src.width, Math.max(x0 + 1, Math.ceil(sx1)))

      let sum = 0
      let n = 0
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          sum += src.alpha[sy * src.width + sx]
          n++
        }
      }
      const a = n > 0 ? Math.round(sum / n) : 0
      if (a === 0) continue

      const px = ox + x
      const py = oy + y
      if (px < 0 || px >= canvasW || py < 0 || py >= canvasH) continue

      const idx = (py * canvasW + px) * 4
      // Coverage goes in alpha; the hue is the variant's, and is ignored by macOS on
      // the template ones, which it tints itself.
      pixels[idx] = colour[0]
      pixels[idx + 1] = colour[1]
      pixels[idx + 2] = colour[2]
      pixels[idx + 3] = Math.max(pixels[idx + 3], a)
    }
  }
}

/** Draw a status dot in the bottom-right corner. */
function drawDot(pixels, canvasW, canvasH, radius, colour) {
  const cx = canvasW - radius - 1
  const cy = canvasH - radius - 1

  for (let y = 0; y < canvasH; y++) {
    for (let x = 0; x < canvasW; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      if (dist <= radius) {
        const idx = (y * canvasW + x) * 4
        const alpha = dist > radius - 1 ? Math.round(255 * (radius - dist)) : 255
        pixels[idx] = colour[0]
        pixels[idx + 1] = colour[1]
        pixels[idx + 2] = colour[2]
        pixels[idx + 3] = Math.max(0, Math.min(255, alpha))
      }
    }
  }
}

function generateIcon(src, scale, withDot, colour) {
  const canvasW = CANVAS_W * scale
  const canvasH = CANVAS_H * scale
  const pad = PADDING * scale
  const pixels = Buffer.alloc(canvasW * canvasH * 4, 0) // transparent

  // Fit the mark inside the padded box, preserving its aspect ratio.
  const boxW = canvasW - 2 * pad
  const boxH = canvasH - 2 * pad
  const fit = Math.min(boxW / src.width, boxH / src.height)
  const dw = Math.max(1, Math.round(src.width * fit))
  const dh = Math.max(1, Math.round(src.height * fit))
  const ox = Math.round((canvasW - dw) / 2)
  const oy = Math.round((canvasH - dh) / 2)

  drawMark(pixels, canvasW, canvasH, src, ox, oy, dw, dh, colour)

  if (withDot) {
    drawDot(pixels, canvasW, canvasH, Math.max(2, DOT_RADIUS * canvasH), colour)
  }

  return { png: createPNG(canvasW, canvasH, pixels), canvasW, canvasH, dw, dh }
}

// ── Main ─────────────────────────────────────────────────────────────────────

/** Painted into the mark and the dot. macOS overrides it on the template variants. */
const BLACK = [0, 0, 0]
/** The app's orange (#F97316). Keep in step with tray-icons.ts, which documents why. */
const ORANGE = [249, 115, 22]

// What tray-icons.ts maps its five aggregate states onto — three files, because
// `idle`, `running` and `waiting` cannot look different from each other under the
// template mask however they are named. `Template` in the filename is load-bearing:
// macOS reads that suffix as "tint this yourself".
const variants = [
  { name: 'trayTemplate', dot: false, colour: BLACK },
  { name: 'trayActiveTemplate', dot: true, colour: BLACK },
  { name: 'trayQuestion', dot: true, colour: ORANGE },
]

const src = readAlpha(SOURCE)
console.log(`source ${path.basename(SOURCE)}: ${src.width}x${src.height}` +
  ` (aspect ${(src.width / src.height).toFixed(3)})`)

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

for (const variant of variants) {
  for (const [scale, suffix2x] of [[1, ''], [2, '@2x']]) {
    const { png, canvasW, canvasH, dw, dh } = generateIcon(src, scale, variant.dot, variant.colour)
    const name = `${variant.name}${suffix2x}.png`
    fs.writeFileSync(path.join(OUTPUT_DIR, name), png)
    if (!suffix2x) {
      console.log(`  ${name}: canvas ${canvasW}x${canvasH}, mark ${dw}x${dh}`)
    }
  }
}

console.log('Tray icons generated in', OUTPUT_DIR)
