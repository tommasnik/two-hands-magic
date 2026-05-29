// ============================================================
// HitZoneSystem — pure TypeScript, no Phaser dependency
// Converts relative (0–1) hit zone rects to absolute pixel rects
// based on the enemy's current on-screen bounding box dimensions.
// ============================================================

import type { HitZoneEntry, HitZoneEntryPx } from '../../types'

/**
 * Scales a relative hit zone map (0–1 space) to absolute canvas pixel coordinates.
 *
 * The enemy's bounding box is defined by:
 *   - topLeft: (enemyX - enemyW/2, enemyY - enemyH/2)
 *   - size:    (enemyW, enemyH)
 *
 * Each HitZoneEntry rect is interpreted as a fraction of the bounding box:
 *   - absX = topLeft.x + entry.rect.x * enemyW
 *   - absY = topLeft.y + entry.rect.y * enemyH
 *   - absW = entry.rect.w * enemyW
 *   - absH = entry.rect.h * enemyH
 *
 * Only active zones are included in the output (active === true).
 * This is a pure function — no side effects, no Phaser imports.
 *
 * @param hitZoneMap - Array of relative hit zone entries from EnemyDef
 * @param enemyX     - Enemy torso-centre X in canvas pixels
 * @param enemyY     - Enemy torso-centre Y in canvas pixels
 * @param enemyW     - Enemy bounding box width in canvas pixels
 * @param enemyH     - Enemy bounding box height in canvas pixels
 * @returns Array of hit zone entries with absolute pixel rects
 */
export function scaleHitZoneMap(
  hitZoneMap: readonly HitZoneEntry[],
  enemyX: number,
  enemyY: number,
  enemyW: number,
  enemyH: number,
): HitZoneEntryPx[] {
  const topLeftX = enemyX - enemyW / 2
  const topLeftY = enemyY - enemyH / 2

  return hitZoneMap
    .filter(entry => entry.active)
    .map(entry => ({
      zone: entry.zone,
      rect: {
        x: topLeftX + entry.rect.x * enemyW,
        y: topLeftY + entry.rect.y * enemyH,
        w: entry.rect.w * enemyW,
        h: entry.rect.h * enemyH,
      },
      active: entry.active,
    }))
}
