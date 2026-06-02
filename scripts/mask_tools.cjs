// Shared mask codec for Node-side tooling (no external dependencies).
//
// Implements the ".msk" binary hit-zone format used by the game runtime
// (see src/game/systems/maskBinary.ts) plus a minimal PNG decoder for the
// legacy RGBA mask PNGs (8-bit, color type 6, non-interlaced — the only
// variant the editor / PixelLab ever produced).
//
// Zone codes: 0 none, 1 head (crit), 2 torso (hit), 3 leftLeg (graze).
// Keep classify() thresholds in sync with MaskHitDetector.loadMaskData().

const zlib = require('zlib')

const MAX_RUN = 0xffff

/** Classify an RGBA pixel into a zone code (same thresholds as the runtime). */
function classify(r, g, b, a) {
  if (a === 0) return 0
  if (r > 200 && g < 50) return 1
  if (r > 200 && g > 200) return 2
  if (g > 200 && r < 50) return 3
  return 0
}

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

/** Decode an 8-bit RGBA (color type 6), non-interlaced PNG into {width,height,rgba}. */
function decodePNG(buffer) {
  let pos = 8 // skip signature
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0
  const idat = []

  while (pos < buffer.length) {
    const len = buffer.readUInt32BE(pos)
    const type = buffer.toString('ascii', pos + 4, pos + 8)
    const data = buffer.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
      interlace = data[12]
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') {
      break
    }
    pos += 12 + len
  }

  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error(`Unsupported PNG (bitDepth=${bitDepth} colorType=${colorType} interlace=${interlace})`)
  }

  const raw = zlib.inflateSync(Buffer.concat(idat))
  const bpp = 4
  const stride = width * bpp
  const out = Buffer.alloc(height * stride)

  let rp = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++]
    const row = out.subarray(y * stride, (y + 1) * stride)
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[rp++]
      const a = x >= bpp ? row[x - bpp] : 0
      const b = prev ? prev[x] : 0
      const c = prev && x >= bpp ? prev[x - bpp] : 0
      let val
      switch (filter) {
        case 0: val = rawByte; break
        case 1: val = rawByte + a; break
        case 2: val = rawByte + b; break
        case 3: val = rawByte + ((a + b) >> 1); break
        case 4: val = rawByte + paeth(a, b, c); break
        default: throw new Error(`Unsupported PNG filter ${filter}`)
      }
      row[x] = val & 0xff
    }
  }

  return { width, height, rgba: out }
}

/** RLE-encode a row-major zone-code array into a ".msk" Buffer. */
function encodeMsk(codes, width, height) {
  const n = width * height
  const runs = []
  let i = 0
  while (i < n) {
    const code = codes[i]
    let len = 1
    while (i + len < n && codes[i + len] === code && len < MAX_RUN) len++
    runs.push(len, code)
    i += len
  }
  const out = Buffer.alloc(8 + (runs.length / 2) * 3)
  out[0] = 0x4d; out[1] = 0x53; out[2] = 0x4b; out[3] = 0x31 // 'MSK1'
  out.writeUInt16LE(width, 4)
  out.writeUInt16LE(height, 6)
  let o = 8
  for (let r = 0; r < runs.length; r += 2) {
    out.writeUInt16LE(runs[r], o)
    out[o + 2] = runs[r + 1]
    o += 3
  }
  return out
}

module.exports = { classify, decodePNG, encodeMsk }
