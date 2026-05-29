// ============================================================
// MaskHitDetector — pure TypeScript, no Phaser dependency
// Pixel-perfect hit detection from pre-parsed PNG mask data.
// ============================================================

import type { HitZoneName } from '../../types'

/**
 * Key format for internal mask storage: "animKey:frameIndex"
 * e.g. "idle:3" or "throw:0"
 */
type MaskKey = string

/** Internal mask data entry — raw RGBA pixel buffer + dimensions. */
interface MaskEntry {
  data: Uint8Array
  width: number
  height: number
}

/**
 * Pixel-perfect hit zone detector using pre-loaded PNG mask data.
 *
 * Each mask is a 128x128 RGBA image where pixel colors encode zone types:
 *   - alpha = 0      -> 'none' (miss — transparent pixel)
 *   - R > 200, G < 50 -> 'head' (crit zone — red)
 *   - R > 200, G > 200 -> 'torso' (hit zone — yellow)
 *   - G > 200, R < 50 -> 'leftLeg' (graze zone — green)
 *   - anything else    -> 'none'
 *
 * No Phaser, no browser APIs — only Uint8Array and math.
 */
export class MaskHitDetector {
  private _masks = new Map<MaskKey, MaskEntry>()

  /**
   * Register mask pixel data for a specific animation frame.
   * Must be called during asset loading (before gameplay begins).
   *
   * @param animKey    - Animation name (e.g. 'idle', 'throw')
   * @param frameIndex - Zero-based frame index within the animation
   * @param data       - Raw RGBA pixel data (width * height * 4 bytes)
   * @param width      - Mask image width in pixels
   * @param height     - Mask image height in pixels
   */
  loadMaskData(animKey: string, frameIndex: number, data: Uint8Array, width: number, height: number): void {
    const key: MaskKey = `${animKey}:${frameIndex}`
    this._masks.set(key, { data, width, height })
  }

  /**
   * Returns the hit zone name for a pixel coordinate on a specific animation frame.
   *
   * @param animKey    - Current animation name (e.g. 'idle', 'throw')
   * @param frameIndex - Current frame index within the animation
   * @param frameX     - X coordinate in mask pixel space (0–127 for 128px masks)
   * @param frameY     - Y coordinate in mask pixel space (0–127 for 128px masks)
   * @returns Zone name: 'head' (crit), 'torso' (hit), 'leftLeg' (graze), or 'none' (miss)
   */
  getZone(animKey: string, frameIndex: number, frameX: number, frameY: number): HitZoneName {
    const key: MaskKey = `${animKey}:${frameIndex}`
    const entry = this._masks.get(key)
    if (!entry) return 'none'

    // Bounds check
    const ix = Math.floor(frameX)
    const iy = Math.floor(frameY)
    if (ix < 0 || ix >= entry.width || iy < 0 || iy >= entry.height) return 'none'

    // Read RGBA at pixel (ix, iy)
    const offset = (iy * entry.width + ix) * 4
    const r = entry.data[offset]
    const g = entry.data[offset + 1]
    // b is at offset + 2 but unused
    const a = entry.data[offset + 3]

    // Transparent = miss
    if (a === 0) return 'none'

    // Red channel dominant, green low = crit (head)
    if (r > 200 && g < 50) return 'head'

    // Both red and green high = hit (torso) — yellow
    if (r > 200 && g > 200) return 'torso'

    // Green dominant, red low = graze (leftLeg)
    if (g > 200 && r < 50) return 'leftLeg'

    return 'none'
  }

  /**
   * Returns true if mask data has been loaded for the given animation key and frame.
   * Useful for checking if pixel-perfect detection is available.
   */
  hasMask(animKey: string, frameIndex: number): boolean {
    return this._masks.has(`${animKey}:${frameIndex}`)
  }
}
