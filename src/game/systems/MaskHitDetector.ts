// ============================================================
// MaskHitDetector — pure TypeScript, no Phaser dependency
// Pixel-perfect hit detection from pre-parsed hit-zone masks.
// ============================================================

import type { HitZoneName } from '../../types'
import { MASK_ZONE, zoneCodeToName } from './maskBinary'

/**
 * Key format for internal mask storage: "spriteKey:animKey:frameIndex"
 * e.g. "stone_giant:idle:3" or "plague_rat:attack:0"
 */
type MaskKey = string

/** Internal mask entry — one zone code per pixel (row-major) + dimensions. */
interface MaskEntry {
  codes: Uint8Array
  width: number
  height: number
}

/**
 * Pixel-perfect hit zone detector.
 *
 * Masks are stored as a compact zone-code grid: one byte per pixel, where
 *   0 -> 'none'    (miss)
 *   1 -> 'head'    (crit)
 *   2 -> 'torso'   (hit)
 *   3 -> 'leftLeg' (graze)
 *
 * The runtime feeds codes directly via {@link loadZones} (decoded from the
 * compact ".msk" binary format — see maskBinary.ts). {@link loadMaskData}
 * remains as an RGBA convenience that classifies pixel colors into codes;
 * it is the single place the legacy color encoding is interpreted.
 *
 * No Phaser, no browser APIs — only Uint8Array and math.
 */
export class MaskHitDetector {
  private _masks = new Map<MaskKey, MaskEntry>()

  /**
   * Register pre-decoded zone codes for a specific animation frame.
   * This is the fast runtime path — codes come straight from a decoded .msk.
   *
   * @param spriteKey  - Character sprite key prefix (e.g. 'stone_giant')
   * @param animKey    - Animation name (e.g. 'idle', 'attack')
   * @param frameIndex - Zero-based frame index within the animation
   * @param codes      - width * height zone codes (1 byte per pixel, row-major)
   * @param width      - Mask width in pixels
   * @param height     - Mask height in pixels
   */
  loadZones(spriteKey: string, animKey: string, frameIndex: number, codes: Uint8Array, width: number, height: number): void {
    const key: MaskKey = `${spriteKey}:${animKey}:${frameIndex}`
    this._masks.set(key, { codes, width, height })
  }

  /**
   * Register mask data from a raw RGBA pixel buffer, classifying colors into
   * zone codes. Retained for tests and any RGBA-sourced caller:
   *   - alpha = 0       -> none (transparent)
   *   - R > 200, G < 50  -> head  (crit, red)
   *   - R > 200, G > 200 -> torso (hit, yellow)
   *   - G > 200, R < 50  -> leftLeg (graze, green)
   *   - anything else    -> none
   *
   * @param data - Raw RGBA pixel data (width * height * 4 bytes)
   */
  loadMaskData(spriteKey: string, animKey: string, frameIndex: number, data: Uint8Array, width: number, height: number): void {
    const codes = new Uint8Array(width * height)
    for (let i = 0; i < codes.length; i++) {
      const offset = i * 4
      const r = data[offset]
      const g = data[offset + 1]
      const a = data[offset + 3]
      if (a === 0) {
        codes[i] = MASK_ZONE.none
      } else if (r > 200 && g < 50) {
        codes[i] = MASK_ZONE.head
      } else if (r > 200 && g > 200) {
        codes[i] = MASK_ZONE.torso
      } else if (g > 200 && r < 50) {
        codes[i] = MASK_ZONE.leftLeg
      } else {
        codes[i] = MASK_ZONE.none
      }
    }
    this.loadZones(spriteKey, animKey, frameIndex, codes, width, height)
  }

  /**
   * Returns the hit zone name for a pixel coordinate on a specific animation frame.
   *
   * @returns Zone name: 'head' (crit), 'torso' (hit), 'leftLeg' (graze), or 'none' (miss)
   */
  getZone(spriteKey: string, animKey: string, frameIndex: number, frameX: number, frameY: number): HitZoneName {
    const key: MaskKey = `${spriteKey}:${animKey}:${frameIndex}`
    const entry = this._masks.get(key)
    if (!entry) return 'none'

    const ix = Math.floor(frameX)
    const iy = Math.floor(frameY)
    if (ix < 0 || ix >= entry.width || iy < 0 || iy >= entry.height) return 'none'

    return zoneCodeToName(entry.codes[iy * entry.width + ix])
  }

  /**
   * Returns true if mask data has been loaded for the given character, animation key and frame.
   */
  hasMask(spriteKey: string, animKey: string, frameIndex: number): boolean {
    return this._masks.has(`${spriteKey}:${animKey}:${frameIndex}`)
  }

  getMaskDimensions(spriteKey: string, animKey: string, frameIndex: number): { width: number; height: number } | undefined {
    const entry = this._masks.get(`${spriteKey}:${animKey}:${frameIndex}`)
    if (!entry) return undefined
    return { width: entry.width, height: entry.height }
  }
}
