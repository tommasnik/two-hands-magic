import { describe, it, expect } from 'vitest'
import { encodeMask, decodeMask, zoneCodeToName, MASK_ZONE, MASK_MAGIC } from '../../game/systems/maskBinary'

describe('maskBinary', () => {
  describe('zoneCodeToName', () => {
    it('maps known codes', () => {
      expect(zoneCodeToName(MASK_ZONE.none)).toBe('none')
      expect(zoneCodeToName(MASK_ZONE.head)).toBe('head')
      expect(zoneCodeToName(MASK_ZONE.torso)).toBe('torso')
      expect(zoneCodeToName(MASK_ZONE.leftLeg)).toBe('leftLeg')
    })

    it('maps unknown codes to none', () => {
      expect(zoneCodeToName(99)).toBe('none')
    })
  })

  describe('encode/decode round-trip', () => {
    it('preserves a mixed-zone grid exactly', () => {
      const width = 4
      const height = 3
      // Row-major: a mix of all four codes with adjacent runs.
      const codes = new Uint8Array([
        0, 0, 1, 1,
        2, 2, 2, 3,
        3, 0, 1, 2,
      ])
      const decoded = decodeMask(encodeMask(codes, width, height))
      expect(decoded.width).toBe(width)
      expect(decoded.height).toBe(height)
      expect(Array.from(decoded.codes)).toEqual(Array.from(codes))
    })

    it('writes the MSK1 magic header', () => {
      const bytes = encodeMask(new Uint8Array([1, 2]), 2, 1)
      const magic = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0
      expect(magic).toBe(MASK_MAGIC)
    })

    it('round-trips a fully uniform single-run grid (run reaches end)', () => {
      const codes = new Uint8Array(16).fill(3)
      const decoded = decodeMask(encodeMask(codes, 4, 4))
      expect(Array.from(decoded.codes)).toEqual(Array.from(codes))
    })

    it('splits runs longer than the u16 cap (>65535 identical pixels)', () => {
      const width = 350
      const height = 200 // 70000 pixels, all identical → forces a run-length split
      const codes = new Uint8Array(width * height).fill(2)
      const encoded = encodeMask(codes, width, height)
      const decoded = decodeMask(encoded)
      expect(decoded.codes.length).toBe(width * height)
      expect(decoded.codes.every(c => c === 2)).toBe(true)
    })

    it('accepts an ArrayBuffer as well as a Uint8Array', () => {
      const encoded = encodeMask(new Uint8Array([1, 2, 3, 0]), 2, 2)
      // Copy into a standalone ArrayBuffer to exercise the non-Uint8Array branch.
      const ab = encoded.slice().buffer
      const decoded = decodeMask(ab)
      expect(Array.from(decoded.codes)).toEqual([1, 2, 3, 0])
    })
  })

  describe('decode robustness', () => {
    it('throws on a truncated/too-short buffer', () => {
      expect(() => decodeMask(new Uint8Array([0x4d, 0x53]))).toThrow(/invalid \.msk/)
    })

    it('throws on a wrong magic header', () => {
      const bad = new Uint8Array(12)
      bad[0] = 0x00 // not 'M'
      expect(() => decodeMask(bad)).toThrow(/invalid \.msk/)
    })

    it('clamps an overlong final run to the pixel count and stops early', () => {
      // 2x1 = 2 pixels. Hand-build: header + one run claiming length 5, then a
      // trailing run that should never be read (p already reached codes.length).
      const bytes = new Uint8Array([
        0x4d, 0x53, 0x4b, 0x31, // magic
        2, 0, // width = 2
        1, 0, // height = 1
        5, 0, 1, // run: length 5 (clamped to 2), code 1
        9, 0, 2, // run that must be ignored — pixel budget exhausted
      ])
      const decoded = decodeMask(bytes)
      expect(Array.from(decoded.codes)).toEqual([1, 1])
    })
  })
})
