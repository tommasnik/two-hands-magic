// ============================================================
// maskBinary — pure TypeScript, no Phaser / browser dependency.
//
// Compact binary hit-zone mask format (".msk"). One byte per pixel
// encodes the hit zone, RLE-compressed. This replaces the old approach
// of shipping RGBA PNG masks and decoding them through a <canvas> +
// getImageData() at load time (slow GPU→CPU readback, 4 bytes/pixel).
//
// File layout (all multi-byte values little-endian):
//   offset 0  : magic  'M' 'S' 'K' '1'  (0x4D 0x53 0x4B 0x31)
//   offset 4  : u16 width
//   offset 6  : u16 height
//   offset 8+ : RLE run stream until width*height pixels are covered.
//               Each run = [u16 runLength][u8 zoneCode].
//
// Zone codes are shared with the editor and the generator scripts —
// keep all three implementations in sync if this ever changes.
// ============================================================

import type { HitZoneName } from '../../types'

/** 'MSK1' interpreted as a big-endian 32-bit integer (bytes 0..3 in file order). */
export const MASK_MAGIC = 0x4d534b31

/** Fixed header size in bytes: 4 magic + u16 width + u16 height. */
const HEADER_BYTES = 8

/** Maximum length a single RLE run can encode (u16). */
const MAX_RUN = 0xffff

/** Zone code → hit zone mapping. Code 0 (and any unknown code) means "no zone". */
export const MASK_ZONE = {
  none: 0,
  head: 1,
  torso: 2,
  leftLeg: 3,
} as const

/** A decoded mask: zone codes (1 byte per pixel, row-major) plus dimensions. */
export interface DecodedMask {
  width: number
  height: number
  codes: Uint8Array
}

/**
 * Map a numeric zone code to its hit-zone name.
 * 1 = head (crit), 2 = torso (hit), 3 = leftLeg (graze); everything else = none.
 */
export function zoneCodeToName(code: number): HitZoneName {
  switch (code) {
    case 1:
      return 'head'
    case 2:
      return 'torso'
    case 3:
      return 'leftLeg'
    default:
      return 'none'
  }
}

/**
 * Encode a row-major array of zone codes into the compact ".msk" binary format.
 *
 * @param codes  - width*height zone codes (1 byte each).
 * @param width  - mask width in pixels.
 * @param height - mask height in pixels.
 * @returns A Uint8Array containing the full .msk file bytes.
 */
export function encodeMask(codes: Uint8Array, width: number, height: number): Uint8Array {
  const pixelCount = width * height

  // Build the RLE run list first so we know the exact output size.
  const runs: number[] = []
  let i = 0
  while (i < pixelCount) {
    const code = codes[i]
    let len = 1
    while (i + len < pixelCount && codes[i + len] === code && len < MAX_RUN) {
      len++
    }
    runs.push(len, code)
    i += len
  }

  const out = new Uint8Array(HEADER_BYTES + (runs.length / 2) * 3)
  out[0] = 0x4d // 'M'
  out[1] = 0x53 // 'S'
  out[2] = 0x4b // 'K'
  out[3] = 0x31 // '1'
  out[4] = width & 0xff
  out[5] = (width >> 8) & 0xff
  out[6] = height & 0xff
  out[7] = (height >> 8) & 0xff

  let o = HEADER_BYTES
  for (let r = 0; r < runs.length; r += 2) {
    const len = runs[r]
    const code = runs[r + 1]
    out[o] = len & 0xff
    out[o + 1] = (len >> 8) & 0xff
    out[o + 2] = code
    o += 3
  }
  return out
}

/**
 * Decode a ".msk" binary buffer into zone codes + dimensions.
 *
 * @param buffer - Raw .msk bytes (ArrayBuffer from a fetch/loader, or a Uint8Array).
 * @throws If the magic header is missing or the buffer is too short.
 */
export function decodeMask(buffer: ArrayBuffer | Uint8Array): DecodedMask {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)

  const magic = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0
  if (bytes.length < HEADER_BYTES || magic !== MASK_MAGIC) {
    throw new Error('decodeMask: invalid .msk data (bad magic or truncated header)')
  }

  const width = bytes[4] | (bytes[5] << 8)
  const height = bytes[6] | (bytes[7] << 8)
  const codes = new Uint8Array(width * height)

  let o = HEADER_BYTES
  let p = 0
  while (o + 3 <= bytes.length && p < codes.length) {
    const len = bytes[o] | (bytes[o + 1] << 8)
    const code = bytes[o + 2]
    o += 3
    const end = Math.min(p + len, codes.length)
    codes.fill(code, p, end)
    p = end
  }

  return { width, height, codes }
}
