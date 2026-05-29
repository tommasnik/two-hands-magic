// ============================================================
// Enemy entity — pure TypeScript, no Phaser dependency
// Hit detection uses pixel coordinates matching logical canvas space.
// ============================================================

import type { HitResult, HitZoneName, HitZoneLayout } from '../../types'
import type { MaskHitDetector } from '../systems/MaskHitDetector'
import {
  ENEMY_HEAD_RADIUS_PX,
  ENEMY_TORSO_WIDTH_PX,
  ENEMY_TORSO_HEIGHT_PX,
  ENEMY_LIMB_RADIUS_PX,
} from '../constants'

/**
 * Computes squared Euclidean distance between two points.
 * Avoids a sqrt for circle containment tests.
 */
function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

/**
 * Tests whether a point lies inside (or on the boundary of) a circle.
 * A small epsilon is added to handle floating-point boundary cases gracefully.
 */
function inCircle(
  px: number,
  py: number,
  cx: number,
  cy: number,
  r: number,
): boolean {
  const EPSILON = 1e-9
  return distSq(px, py, cx, cy) <= r * r + EPSILON
}

/**
 * Tests whether a circle of radius `r` centred at (px, py) intersects an
 * axis-aligned rectangle defined by its centre (cx, cy) and half-extents (hw, hh).
 * Closest-point-on-rect formulation — exact (no over-coverage at corners).
 * Reduces to a point-in-rect check when r = 0.
 */
function circleIntersectsRect(
  px: number,
  py: number,
  cx: number,
  cy: number,
  hw: number,
  hh: number,
  r: number,
): boolean {
  const EPSILON = 1e-9
  const closestX = Math.max(cx - hw, Math.min(px, cx + hw))
  const closestY = Math.max(cy - hh, Math.min(py, cy + hh))
  const dx = px - closestX
  const dy = py - closestY
  return dx * dx + dy * dy <= r * r + EPSILON
}

/**
 * Enemy entity.
 *
 * `x` and `y` define the centre of the torso in logical canvas pixels.
 *
 * Hit detection has two modes:
 *
 * 1. When `hitZoneLayout` is provided (all 15 named enemy types):
 *    Three-circle model — crit / mid / low zones read from the layout descriptor.
 *    Zone model:
 *      crit  = CRIT  — circle at (x + critDx, y + critDy), radius critRadius
 *      mid   = HIT   — circle at (x + midDx,  y + midDy),  radius midRadius
 *      low   = GRAZE — circle at (x + lowDx,  y + lowDy),  radius lowRadius
 *    Priority: crit → mid → low → none.
 *
 * 2. When `hitZoneLayout` is omitted (legacy / tests, generic Enemy):
 *    Classic six-part humanoid model using global body constants:
 *      head (circle), torso (rect), left/right arms (circles), left/right legs (circles).
 *    Zone priority: head → torso → leftArm → rightArm → leftLeg → rightLeg → none.
 */
const ZONE_TO_HIT_RESULT: Record<string, HitResult> = {
  head: 'CRIT',
  torso: 'HIT',
  leftArm: 'GRAZE',
  rightArm: 'GRAZE',
  leftLeg: 'GRAZE',
  rightLeg: 'GRAZE',
  none: 'MISS',
}

export class Enemy {
  /**
   * Per-enemy hit zone layout from EnemyDef.
   * When set, drives getHitZone() / getHitResult() via the three-circle model.
   * When undefined, falls back to the legacy six-part humanoid geometry.
   */
  readonly hitZoneLayout: HitZoneLayout | undefined

  /**
   * Optional pixel-perfect mask detector for sprite-based enemies.
   * When set, _resolveZone delegates to the mask lookup before falling back
   * to the standard hitZoneLayout / legacy geometry.
   */
  readonly maskDetector: MaskHitDetector | undefined

  /**
   * Display width of the sprite in canvas pixels.
   * Used for world-to-frame coordinate conversion when maskDetector is active.
   * Unit: px. Default: 128 (1:1 with mask dimensions).
   */
  readonly displayWidth: number

  /**
   * Display height of the sprite in canvas pixels.
   * Used for world-to-frame coordinate conversion when maskDetector is active.
   * Unit: px. Default: 128 (1:1 with mask dimensions).
   */
  readonly displayHeight: number

  /** Current animation key for mask lookup (e.g. 'idle', 'throw'). */
  currentAnimKey = 'idle'

  /** Current frame index within the active animation for mask lookup. */
  currentFrameIndex = 0

  constructor(
    public x: number,
    public y: number,
    hitZoneLayout?: HitZoneLayout,
    maskDetector?: MaskHitDetector,
    displayWidth = 128,
    displayHeight = 128,
  ) {
    this.hitZoneLayout = hitZoneLayout
    this.maskDetector = maskDetector
    this.displayWidth = displayWidth
    this.displayHeight = displayHeight
  }

  /**
   * Single source of hit geometry — returns the zone name for a given point.
   *
   * If hitZoneLayout is set: uses the three-circle model (crit/mid/low).
   * Otherwise: uses the legacy six-part humanoid model (head/torso/arms/legs).
   *
   * `projectileRadius` (px) treats the incoming projectile as a disc rather than a
   * point — each zone effectively grows by that radius (circle-vs-circle for
   * circular zones, circle-vs-rect for the legacy torso). Defaults to 0, which
   * collapses to the original point-based geometry.
   */
  private _resolveZone(
    point: { x: number; y: number },
    critZoneTolerance: number,
    projectileRadius: number,
  ): HitZoneName {
    const { x: ex, y: ey } = this
    const { x: px, y: py } = point

    // Pixel-perfect mask detection — if maskDetector is available and has data
    // for the current frame, use it instead of geometric hit zones.
    if (this.maskDetector && this.maskDetector.hasMask(this.currentAnimKey, this.currentFrameIndex)) {
      const maskZone = this._resolveZoneFromMask(px, py, ex, ey)
      if (maskZone !== 'none') return maskZone
      // If mask says 'none' (miss), fall through to geometric check as final fallback
      // so projectileRadius inflation still works at sprite edges.
    }

    const baseZone = this.hitZoneLayout
      ? this._resolveZoneFromLayout(px, py, ex, ey, this.hitZoneLayout, projectileRadius)
      : this._resolveZoneLegacy(px, py, ex, ey, projectileRadius)

    if (baseZone === 'head' || critZoneTolerance <= 0) return baseZone
    // A point that misses every body zone stays a miss — critZoneTolerance must
    // not turn a complete miss into a CRIT, only widen the acceptance band on
    // shots that already landed on the enemy.
    if (baseZone === 'none') return baseZone

    // Near-miss CRIT promotion — a shot that landed just outside the crit radius
    // is upgraded to a CRIT when distToCritCenter < critRadius × (1 + tolerance) + projectileRadius.
    // The projectile disc is an ADDITIVE extension only; critZoneTolerance widens
    // the crit ring itself (multiplicative on critRadius), not the disc — otherwise
    // spell_area + crit_zone would double-count the disc against the tolerance.
    if (this.hitZoneLayout) {
      const cx = ex + this.hitZoneLayout.critDx
      const cy = ey + this.hitZoneLayout.critDy
      const expanded = this.hitZoneLayout.critRadius * (1 + critZoneTolerance) + projectileRadius
      if (inCircle(px, py, cx, cy, expanded)) return 'head'
    } else {
      const headCY = ey - ENEMY_TORSO_HEIGHT_PX / 2 - ENEMY_HEAD_RADIUS_PX
      const expanded = ENEMY_HEAD_RADIUS_PX * (1 + critZoneTolerance) + projectileRadius
      if (inCircle(px, py, ex, headCY, expanded)) return 'head'
    }
    return baseZone
  }

  /**
   * Three-circle hit zone model using the hitZoneLayout descriptor.
   * Reads geometry entirely from the def — no global constants.
   * Each zone radius is inflated by `projectileRadius` for circle-vs-circle detection.
   */
  private _resolveZoneFromLayout(
    px: number, py: number,
    ex: number, ey: number,
    layout: HitZoneLayout,
    projectileRadius: number,
  ): HitZoneName {
    // CRIT zone — head / weak point
    const critCX = ex + layout.critDx
    const critCY = ey + layout.critDy
    if (inCircle(px, py, critCX, critCY, layout.critRadius + projectileRadius)) return 'head'

    // HIT zone — body / torso
    const midCX = ex + layout.midDx
    const midCY = ey + layout.midDy
    if (inCircle(px, py, midCX, midCY, layout.midRadius + projectileRadius)) return 'torso'

    // GRAZE zone — limbs / extremities (outer ring beyond mid zone)
    const lowCX = ex + layout.lowDx
    const lowCY = ey + layout.lowDy
    if (inCircle(px, py, lowCX, lowCY, layout.lowRadius + projectileRadius)) return 'leftLeg'

    return 'none'
  }

  /**
   * Legacy six-part humanoid hit zone model.
   * Used when no hitZoneLayout is provided — preserves exact backward-compatible behaviour
   * when projectileRadius = 0. Non-zero radius uses circle-vs-circle for limbs and
   * circle-vs-rect for the torso.
   * Zone layout (offsets from torso centre):
   * - Head      : circle, radius = HEAD_RADIUS_PX, centre = (0, -TORSO_HEIGHT_PX/2 - HEAD_RADIUS_PX)
   * - Torso     : rect, half-w = TORSO_WIDTH_PX/2, half-h = TORSO_HEIGHT_PX/2, centre = (0, 0)
   * - Left arm  : circle, radius = LIMB_RADIUS_PX, centre = (-TORSO_WIDTH_PX/2 - LIMB_RADIUS_PX, -TORSO_HEIGHT_PX/4)
   * - Right arm : circle, radius = LIMB_RADIUS_PX, centre = (+TORSO_WIDTH_PX/2 + LIMB_RADIUS_PX, -TORSO_HEIGHT_PX/4)
   * - Left leg  : circle, radius = LIMB_RADIUS_PX, centre = (-TORSO_WIDTH_PX/4, +TORSO_HEIGHT_PX/2 + LIMB_RADIUS_PX)
   * - Right leg : circle, radius = LIMB_RADIUS_PX, centre = (+TORSO_WIDTH_PX/4, +TORSO_HEIGHT_PX/2 + LIMB_RADIUS_PX)
   */
  private _resolveZoneLegacy(
    px: number, py: number,
    ex: number, ey: number,
    projectileRadius: number,
  ): HitZoneName {
    const headCY = ey - ENEMY_TORSO_HEIGHT_PX / 2 - ENEMY_HEAD_RADIUS_PX
    if (inCircle(px, py, ex, headCY, ENEMY_HEAD_RADIUS_PX + projectileRadius)) return 'head'

    if (circleIntersectsRect(px, py, ex, ey, ENEMY_TORSO_WIDTH_PX / 2, ENEMY_TORSO_HEIGHT_PX / 2, projectileRadius)) return 'torso'

    const armCY = ey - ENEMY_TORSO_HEIGHT_PX / 4
    const leftArmCX = ex - ENEMY_TORSO_WIDTH_PX / 2 - ENEMY_LIMB_RADIUS_PX
    if (inCircle(px, py, leftArmCX, armCY, ENEMY_LIMB_RADIUS_PX + projectileRadius)) return 'leftArm'

    const rightArmCX = ex + ENEMY_TORSO_WIDTH_PX / 2 + ENEMY_LIMB_RADIUS_PX
    if (inCircle(px, py, rightArmCX, armCY, ENEMY_LIMB_RADIUS_PX + projectileRadius)) return 'rightArm'

    const legCY = ey + ENEMY_TORSO_HEIGHT_PX / 2 + ENEMY_LIMB_RADIUS_PX
    const leftLegCX = ex - ENEMY_TORSO_WIDTH_PX / 4
    if (inCircle(px, py, leftLegCX, legCY, ENEMY_LIMB_RADIUS_PX + projectileRadius)) return 'leftLeg'

    const rightLegCX = ex + ENEMY_TORSO_WIDTH_PX / 4
    if (inCircle(px, py, rightLegCX, legCY, ENEMY_LIMB_RADIUS_PX + projectileRadius)) return 'rightLeg'

    return 'none'
  }

  /**
   * Pixel-perfect mask-based hit zone resolution.
   * Converts world coordinates to frame-local pixel coordinates and looks up
   * the zone from the mask data via maskDetector.
   *
   * World-to-frame mapping:
   *   The sprite is rendered centred at (ex, ey) with a vertical offset of -0.6*displayHeight
   *   (matching BattleScene._drawEnemySprite). The frame origin is at the top-left of the
   *   drawn rectangle: (ex - displayWidth/2, ey - displayHeight * 0.6).
   *   Frame pixel = (worldX - frameOriginX) * (maskWidth / displayWidth)
   *
   * Mask dimensions are assumed to be 128x128 (matching the downloaded assets).
   */
  private _resolveZoneFromMask(
    px: number, py: number,
    ex: number, ey: number,
  ): HitZoneName {
    // maskDetector is guaranteed non-null by the caller (_resolveZone checks it)
    const MASK_SIZE = 128
    // Sprite draw origin matches BattleScene: centred horizontally, offset 0.6 up vertically
    const frameOriginX = ex - this.displayWidth / 2
    const frameOriginY = ey - this.displayHeight * 0.6

    const frameX = (px - frameOriginX) * (MASK_SIZE / this.displayWidth)
    const frameY = (py - frameOriginY) * (MASK_SIZE / this.displayHeight)

    return this.maskDetector!.getZone(this.currentAnimKey, this.currentFrameIndex, frameX, frameY)
  }

  /**
   * Returns the zone name for a point, or 'none' for a miss.
   * critZoneTolerance (0–1) widens the CRIT acceptance radius by that fraction
   * so near-miss shots get promoted to CRIT. Defaults to 0.
   * projectileRadius (px) treats the incoming projectile as a disc and inflates
   * every zone radius by that amount. Defaults to 0 (point-vs-zone).
   */
  getHitZone(
    point: { x: number; y: number },
    critZoneTolerance = 0,
    projectileRadius = 0,
  ): HitZoneName {
    return this._resolveZone(point, critZoneTolerance, projectileRadius)
  }

  /**
   * Returns the HitResult for a point. Delegates zone resolution to _resolveZone().
   * critZoneTolerance (0–1) widens the CRIT acceptance radius by that fraction.
   * projectileRadius (px) treats the projectile as a disc — defaults to 0.
   */
  getHitResult(
    point: { x: number; y: number },
    critZoneTolerance = 0,
    projectileRadius = 0,
  ): HitResult {
    return ZONE_TO_HIT_RESULT[this._resolveZone(point, critZoneTolerance, projectileRadius)]
  }
}
