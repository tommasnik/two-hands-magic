import { describe, it, expect, beforeEach } from 'vitest'
import { MaskHitDetector } from '../../game/systems/MaskHitDetector'

// ============================================================
// MaskHitDetector unit tests
// Uses manually constructed Uint8Array mask data (128x128 RGBA).
// ============================================================

const W = 128
const H = 128

/**
 * Creates a 128x128 RGBA Uint8Array with a specified zone fill pattern.
 * Fills the top third red (crit), middle third yellow (hit), bottom third green (graze).
 * Pixels outside the specified bounding box remain transparent.
 */
function createTestMask(
  bbox: { x: number; y: number; w: number; h: number },
): Uint8Array {
  const data = new Uint8Array(W * H * 4)
  const third = bbox.h / 3

  for (let y = bbox.y; y < bbox.y + bbox.h; y++) {
    for (let x = bbox.x; x < bbox.x + bbox.w; x++) {
      const offset = (y * W + x) * 4
      const relY = y - bbox.y

      if (relY < third) {
        // Crit zone — red (#ff0000)
        data[offset] = 255     // R
        data[offset + 1] = 0   // G
        data[offset + 2] = 0   // B
        data[offset + 3] = 255 // A
      } else if (relY < third * 2) {
        // Hit zone — yellow (#ffff00)
        data[offset] = 255
        data[offset + 1] = 255
        data[offset + 2] = 0
        data[offset + 3] = 255
      } else {
        // Graze zone — green (#00ff00)
        data[offset] = 0
        data[offset + 1] = 255
        data[offset + 2] = 0
        data[offset + 3] = 255
      }
    }
  }
  return data
}

describe('MaskHitDetector', () => {
  let detector: MaskHitDetector

  beforeEach(() => {
    detector = new MaskHitDetector()
  })

  describe('hasMask', () => {
    it('returns false for unloaded masks', () => {
      expect(detector.hasMask('idle', 0)).toBe(false)
    })

    it('returns true after loading mask data', () => {
      const data = new Uint8Array(W * H * 4)
      detector.loadMaskData('idle', 0, data, W, H)
      expect(detector.hasMask('idle', 0)).toBe(true)
    })

    it('returns false for different frame index', () => {
      const data = new Uint8Array(W * H * 4)
      detector.loadMaskData('idle', 0, data, W, H)
      expect(detector.hasMask('idle', 1)).toBe(false)
    })
  })

  describe('getZone — transparent pixels', () => {
    it('returns none for completely transparent mask', () => {
      const data = new Uint8Array(W * H * 4) // all zeros = fully transparent
      detector.loadMaskData('idle', 0, data, W, H)
      expect(detector.getZone('idle', 0, 64, 64)).toBe('none')
    })

    it('returns none for out-of-bounds coordinates', () => {
      const data = createTestMask({ x: 20, y: 20, w: 88, h: 88 })
      detector.loadMaskData('idle', 0, data, W, H)
      expect(detector.getZone('idle', 0, -1, 64)).toBe('none')
      expect(detector.getZone('idle', 0, 128, 64)).toBe('none')
      expect(detector.getZone('idle', 0, 64, -1)).toBe('none')
      expect(detector.getZone('idle', 0, 64, 128)).toBe('none')
    })

    it('returns none for unregistered animation key', () => {
      const data = createTestMask({ x: 20, y: 20, w: 88, h: 88 })
      detector.loadMaskData('idle', 0, data, W, H)
      expect(detector.getZone('throw', 0, 64, 64)).toBe('none')
    })
  })

  describe('getZone — zone detection', () => {
    // Bounding box: x=20..107 (88px wide), y=20..107 (88px tall)
    // Top third:    y=20..49  (crit)
    // Middle third: y=50..78  (hit)
    // Bottom third: y=79..107 (graze)
    const bbox = { x: 20, y: 20, w: 88, h: 88 }

    beforeEach(() => {
      const data = createTestMask(bbox)
      detector.loadMaskData('idle', 0, data, W, H)
    })

    it('returns head (crit) for pixel in top third of bounding box', () => {
      expect(detector.getZone('idle', 0, 64, 25)).toBe('head')
    })

    it('returns torso (hit) for pixel in middle third of bounding box', () => {
      expect(detector.getZone('idle', 0, 64, 55)).toBe('torso')
    })

    it('returns leftLeg (graze) for pixel in bottom third of bounding box', () => {
      expect(detector.getZone('idle', 0, 64, 90)).toBe('leftLeg')
    })

    it('returns none for pixel outside bounding box (transparent)', () => {
      expect(detector.getZone('idle', 0, 10, 10)).toBe('none')
    })

    it('returns none for pixel outside bounding box on the right', () => {
      expect(detector.getZone('idle', 0, 110, 64)).toBe('none')
    })
  })

  describe('getZone — color thresholds', () => {
    it('R=201 G=49 → head (crit)', () => {
      const data = new Uint8Array(W * H * 4)
      data[0] = 201; data[1] = 49; data[2] = 0; data[3] = 255
      detector.loadMaskData('test', 0, data, W, H)
      expect(detector.getZone('test', 0, 0, 0)).toBe('head')
    })

    it('R=201 G=201 → torso (hit)', () => {
      const data = new Uint8Array(W * H * 4)
      data[0] = 201; data[1] = 201; data[2] = 0; data[3] = 255
      detector.loadMaskData('test', 0, data, W, H)
      expect(detector.getZone('test', 0, 0, 0)).toBe('torso')
    })

    it('R=49 G=201 → leftLeg (graze)', () => {
      const data = new Uint8Array(W * H * 4)
      data[0] = 49; data[1] = 201; data[2] = 0; data[3] = 255
      detector.loadMaskData('test', 0, data, W, H)
      expect(detector.getZone('test', 0, 0, 0)).toBe('leftLeg')
    })

    it('R=100 G=100 → none (ambiguous color, no zone match)', () => {
      const data = new Uint8Array(W * H * 4)
      data[0] = 100; data[1] = 100; data[2] = 100; data[3] = 255
      detector.loadMaskData('test', 0, data, W, H)
      expect(detector.getZone('test', 0, 0, 0)).toBe('none')
    })
  })

  describe('multiple animations and frames', () => {
    it('returns correct zone for different animation keys', () => {
      // Idle frame 0: full crit (red)
      const idleData = new Uint8Array(W * H * 4)
      idleData[0] = 255; idleData[1] = 0; idleData[2] = 0; idleData[3] = 255
      detector.loadMaskData('idle', 0, idleData, W, H)

      // Throw frame 0: full hit (yellow)
      const throwData = new Uint8Array(W * H * 4)
      throwData[0] = 255; throwData[1] = 255; throwData[2] = 0; throwData[3] = 255
      detector.loadMaskData('throw', 0, throwData, W, H)

      expect(detector.getZone('idle', 0, 0, 0)).toBe('head')
      expect(detector.getZone('throw', 0, 0, 0)).toBe('torso')
    })

    it('returns correct zone for different frame indices', () => {
      // Frame 0: crit
      const frame0 = new Uint8Array(W * H * 4)
      frame0[0] = 255; frame0[1] = 0; frame0[2] = 0; frame0[3] = 255
      detector.loadMaskData('idle', 0, frame0, W, H)

      // Frame 5: graze
      const frame5 = new Uint8Array(W * H * 4)
      frame5[0] = 0; frame5[1] = 255; frame5[2] = 0; frame5[3] = 255
      detector.loadMaskData('idle', 5, frame5, W, H)

      expect(detector.getZone('idle', 0, 0, 0)).toBe('head')
      expect(detector.getZone('idle', 5, 0, 0)).toBe('leftLeg')
    })
  })
})
