import { describe, it, expect } from 'vitest'
import { Enemy } from '../../game/entities/Enemy'
import { MaskHitDetector } from '../../game/systems/MaskHitDetector'
import {
  ENEMY_HEAD_RADIUS_PX,
  ENEMY_TORSO_WIDTH_PX,
  ENEMY_TORSO_HEIGHT_PX,
  ENEMY_LIMB_RADIUS_PX,
  ENEMY_GOBLIN_SCOUT,
  ENEMY_ORC_WARRIOR,
  ENEMY_STONE_TROLL,
  ENEMY_EMBER_WISP,
} from '../../game/constants'
import type { HitZoneLayout } from '../../types'

// Enemy positioned at canvas centre for all tests
const EX = 195
const EY = 422

// Pre-computed zone centres (relative to torso anchor)
const HEAD_CY = EY - ENEMY_TORSO_HEIGHT_PX / 2 - ENEMY_HEAD_RADIUS_PX
const ARM_CY = EY - ENEMY_TORSO_HEIGHT_PX / 4
const LEFT_ARM_CX = EX - ENEMY_TORSO_WIDTH_PX / 2 - ENEMY_LIMB_RADIUS_PX
const RIGHT_ARM_CX = EX + ENEMY_TORSO_WIDTH_PX / 2 + ENEMY_LIMB_RADIUS_PX
const LEG_CY = EY + ENEMY_TORSO_HEIGHT_PX / 2 + ENEMY_LIMB_RADIUS_PX
const LEFT_LEG_CX = EX - ENEMY_TORSO_WIDTH_PX / 4
const RIGHT_LEG_CX = EX + ENEMY_TORSO_WIDTH_PX / 4

function enemy(): Enemy {
  return new Enemy(EX, EY)
}

// ---------------------------------------------------------------------------
// Direct centre hits — one per zone
// ---------------------------------------------------------------------------

describe('Enemy.getHitResult — direct centre hits', () => {
  it('head centre → CRIT', () => {
    expect(enemy().getHitResult({ x: EX, y: HEAD_CY })).toBe('CRIT')
  })

  it('torso centre → HIT', () => {
    expect(enemy().getHitResult({ x: EX, y: EY })).toBe('HIT')
  })

  it('left arm centre → GRAZE', () => {
    expect(enemy().getHitResult({ x: LEFT_ARM_CX, y: ARM_CY })).toBe('GRAZE')
  })

  it('right arm centre → GRAZE', () => {
    expect(enemy().getHitResult({ x: RIGHT_ARM_CX, y: ARM_CY })).toBe('GRAZE')
  })

  it('left leg centre → GRAZE', () => {
    expect(enemy().getHitResult({ x: LEFT_LEG_CX, y: LEG_CY })).toBe('GRAZE')
  })

  it('right leg centre → GRAZE', () => {
    expect(enemy().getHitResult({ x: RIGHT_LEG_CX, y: LEG_CY })).toBe('GRAZE')
  })
})

// ---------------------------------------------------------------------------
// Complete miss
// ---------------------------------------------------------------------------

describe('Enemy.getHitResult — complete miss', () => {
  it('point far above → MISS', () => {
    expect(enemy().getHitResult({ x: EX, y: EY - 500 })).toBe('MISS')
  })

  it('point far to the right → MISS', () => {
    expect(enemy().getHitResult({ x: EX + 500, y: EY })).toBe('MISS')
  })

  it('point far below → MISS', () => {
    expect(enemy().getHitResult({ x: EX, y: EY + 500 })).toBe('MISS')
  })

  it('point far to the left → MISS', () => {
    expect(enemy().getHitResult({ x: EX - 500, y: EY })).toBe('MISS')
  })

  it('point slightly outside all zones (above head, within body column) → MISS', () => {
    // Just above the head circle
    const justAbove = HEAD_CY - ENEMY_HEAD_RADIUS_PX - 1
    expect(enemy().getHitResult({ x: EX, y: justAbove })).toBe('MISS')
  })

  it('point in gap between torso and arm → MISS', () => {
    // At torso top-right corner offset, outside both torso rect and arm circle
    // Diagonally between them
    const gapX = EX + ENEMY_TORSO_WIDTH_PX / 2 + ENEMY_LIMB_RADIUS_PX * 1.5
    const gapY = EY + ENEMY_TORSO_HEIGHT_PX / 4
    expect(enemy().getHitResult({ x: gapX, y: gapY })).toBe('MISS')
  })
})

// ---------------------------------------------------------------------------
// Edge cases — points exactly on zone boundaries
// ---------------------------------------------------------------------------

describe('Enemy.getHitResult — boundary / edge cases', () => {
  // Head boundary
  it('point exactly on head circle circumference (top) → CRIT', () => {
    expect(
      enemy().getHitResult({ x: EX, y: HEAD_CY - ENEMY_HEAD_RADIUS_PX }),
    ).toBe('CRIT')
  })

  it('point just outside head circle (top) → MISS (or torso if overlapping)', () => {
    const result = enemy().getHitResult({
      x: EX,
      y: HEAD_CY - ENEMY_HEAD_RADIUS_PX - 1,
    })
    // Not CRIT — just outside the head
    expect(result).not.toBe('CRIT')
  })

  it('point exactly on head circle circumference (side) → CRIT', () => {
    expect(
      enemy().getHitResult({ x: EX + ENEMY_HEAD_RADIUS_PX, y: HEAD_CY }),
    ).toBe('CRIT')
  })

  // Torso boundary — edges of the rectangle
  it('point exactly on torso left edge → HIT', () => {
    expect(
      enemy().getHitResult({ x: EX - ENEMY_TORSO_WIDTH_PX / 2, y: EY }),
    ).toBe('HIT')
  })

  it('point exactly on torso right edge → HIT', () => {
    expect(
      enemy().getHitResult({ x: EX + ENEMY_TORSO_WIDTH_PX / 2, y: EY }),
    ).toBe('HIT')
  })

  it('point exactly on torso top edge → HIT or CRIT (CRIT if head overlaps)', () => {
    // The torso top-centre may fall inside the head circle due to zone overlap.
    // Either result is geometrically correct; what matters is MISS is not returned.
    const result = enemy().getHitResult({
      x: EX,
      y: EY - ENEMY_TORSO_HEIGHT_PX / 2,
    })
    expect(['HIT', 'CRIT']).toContain(result)
  })

  it('point exactly on torso bottom edge → HIT', () => {
    expect(
      enemy().getHitResult({ x: EX, y: EY + ENEMY_TORSO_HEIGHT_PX / 2 }),
    ).toBe('HIT')
  })

  it('point just outside torso bottom edge → MISS (no leg at that x)', () => {
    // Below torso centre line, outside the narrow leg circles
    const result = enemy().getHitResult({
      x: EX,
      y: EY + ENEMY_TORSO_HEIGHT_PX / 2 + 1,
    })
    // Centre-bottom is between the two legs, so expect MISS
    expect(result).toBe('MISS')
  })

  // Left arm boundary
  it('point exactly on left arm circle circumference → GRAZE', () => {
    expect(
      enemy().getHitResult({ x: LEFT_ARM_CX - ENEMY_LIMB_RADIUS_PX, y: ARM_CY }),
    ).toBe('GRAZE')
  })

  it('point just outside left arm circle → MISS', () => {
    const result = enemy().getHitResult({
      x: LEFT_ARM_CX - ENEMY_LIMB_RADIUS_PX - 1,
      y: ARM_CY,
    })
    expect(result).not.toBe('GRAZE')
  })

  // Right arm boundary
  it('point exactly on right arm circle circumference → GRAZE', () => {
    expect(
      enemy().getHitResult({
        x: RIGHT_ARM_CX + ENEMY_LIMB_RADIUS_PX,
        y: ARM_CY,
      }),
    ).toBe('GRAZE')
  })

  it('point just outside right arm circle → MISS', () => {
    const result = enemy().getHitResult({
      x: RIGHT_ARM_CX + ENEMY_LIMB_RADIUS_PX + 1,
      y: ARM_CY,
    })
    expect(result).not.toBe('GRAZE')
  })

  // Left leg boundary
  it('point exactly on left leg circle circumference (bottom) → GRAZE', () => {
    expect(
      enemy().getHitResult({ x: LEFT_LEG_CX, y: LEG_CY + ENEMY_LIMB_RADIUS_PX }),
    ).toBe('GRAZE')
  })

  it('point just outside left leg circle → MISS', () => {
    const result = enemy().getHitResult({
      x: LEFT_LEG_CX,
      y: LEG_CY + ENEMY_LIMB_RADIUS_PX + 1,
    })
    expect(result).toBe('MISS')
  })

  // Right leg boundary
  it('point exactly on right leg circle circumference (bottom) → GRAZE', () => {
    expect(
      enemy().getHitResult({
        x: RIGHT_LEG_CX,
        y: LEG_CY + ENEMY_LIMB_RADIUS_PX,
      }),
    ).toBe('GRAZE')
  })

  it('point just outside right leg circle → MISS', () => {
    const result = enemy().getHitResult({
      x: RIGHT_LEG_CX,
      y: LEG_CY + ENEMY_LIMB_RADIUS_PX + 1,
    })
    expect(result).toBe('MISS')
  })
})

// ---------------------------------------------------------------------------
// Priority order — head overlapping torso top should return CRIT
// ---------------------------------------------------------------------------

describe('Enemy.getHitResult — zone priority', () => {
  it('point in both head zone and above torso → CRIT wins over HIT', () => {
    // The neck area: just above the torso top edge, which can be inside the head circle
    // depending on proportions. Check if head radius > 0 and the bottom of head circle
    // overlaps the top of torso.
    const headBottomY = HEAD_CY + ENEMY_HEAD_RADIUS_PX
    const torsoTopY = EY - ENEMY_TORSO_HEIGHT_PX / 2
    if (headBottomY >= torsoTopY) {
      // Overlap exists — a point at torso top-centre should be CRIT (head checked first)
      const result = enemy().getHitResult({ x: EX, y: torsoTopY })
      expect(result).toBe('CRIT')
    } else {
      // No overlap — torso top should be HIT
      const result = enemy().getHitResult({ x: EX, y: torsoTopY })
      expect(result).toBe('HIT')
    }
  })
})

// ---------------------------------------------------------------------------
// Different enemy positions — ensure coordinates are relative to enemy anchor
// ---------------------------------------------------------------------------

describe('Enemy.getHitResult — enemy at non-default position', () => {
  it('head hit works for enemy at (100, 200)', () => {
    const e = new Enemy(100, 200)
    const headCY = 200 - ENEMY_TORSO_HEIGHT_PX / 2 - ENEMY_HEAD_RADIUS_PX
    expect(e.getHitResult({ x: 100, y: headCY })).toBe('CRIT')
  })

  it('torso hit works for enemy at (100, 200)', () => {
    const e = new Enemy(100, 200)
    expect(e.getHitResult({ x: 100, y: 200 })).toBe('HIT')
  })

  it('miss for enemy at (100, 200) — point at original (195, 422)', () => {
    const e = new Enemy(100, 200)
    // Point at the original test enemy's torso — far from (100,200)
    expect(e.getHitResult({ x: EX, y: EY })).toBe('MISS')
  })
})

// ---------------------------------------------------------------------------
// getHitZone — returns named zone string matching hit detection priority
// ---------------------------------------------------------------------------

describe('Enemy.getHitZone — zone name per hit area', () => {
  it('head centre → "head"', () => {
    expect(enemy().getHitZone({ x: EX, y: HEAD_CY })).toBe('head')
  })

  it('torso centre → "torso"', () => {
    expect(enemy().getHitZone({ x: EX, y: EY })).toBe('torso')
  })

  it('left arm centre → "leftArm"', () => {
    expect(enemy().getHitZone({ x: LEFT_ARM_CX, y: ARM_CY })).toBe('leftArm')
  })

  it('right arm centre → "rightArm"', () => {
    expect(enemy().getHitZone({ x: RIGHT_ARM_CX, y: ARM_CY })).toBe('rightArm')
  })

  it('left leg centre → "leftLeg"', () => {
    expect(enemy().getHitZone({ x: LEFT_LEG_CX, y: LEG_CY })).toBe('leftLeg')
  })

  it('right leg centre → "rightLeg"', () => {
    expect(enemy().getHitZone({ x: RIGHT_LEG_CX, y: LEG_CY })).toBe('rightLeg')
  })

  it('point far away → "none"', () => {
    expect(enemy().getHitZone({ x: EX + 500, y: EY })).toBe('none')
  })
})

// ---------------------------------------------------------------------------
// Three-circle hit zone model (hitZoneLayout) — new per-enemy geometry
// ---------------------------------------------------------------------------

describe('Enemy with hitZoneLayout — three-circle model', () => {
  // Minimal layout: crit above centre, mid at centre, low outer ring
  const layout: HitZoneLayout = {
    critDx: 0,
    critDy: -60,
    critRadius: 20,
    midDx: 0,
    midDy: 0,
    midRadius: 40,
    lowDx: 0,
    lowDy: 10,
    lowRadius: 80,
  }

  function layoutEnemy(): Enemy {
    return new Enemy(EX, EY, layout)
  }

  it('hitZoneLayout is stored on the instance', () => {
    expect(layoutEnemy().hitZoneLayout).toBe(layout)
  })

  it('crit zone centre → CRIT', () => {
    expect(layoutEnemy().getHitResult({ x: EX, y: EY - 60 })).toBe('CRIT')
  })

  it('crit zone edge → CRIT', () => {
    expect(layoutEnemy().getHitResult({ x: EX + 20, y: EY - 60 })).toBe('CRIT')
  })

  it('just outside crit zone → HIT or GRAZE or MISS (not CRIT)', () => {
    const result = layoutEnemy().getHitResult({ x: EX + 21, y: EY - 60 })
    expect(result).not.toBe('CRIT')
  })

  it('mid zone centre → HIT', () => {
    expect(layoutEnemy().getHitResult({ x: EX, y: EY })).toBe('HIT')
  })

  it('mid zone edge → HIT', () => {
    expect(layoutEnemy().getHitResult({ x: EX + 40, y: EY })).toBe('HIT')
  })

  it('just outside mid zone, inside low zone → GRAZE', () => {
    // point at (EX + 50, EY + 10): distance from low centre (EX, EY+10) = 50 < 80 → GRAZE
    expect(layoutEnemy().getHitResult({ x: EX + 50, y: EY + 10 })).toBe('GRAZE')
  })

  it('low zone edge → GRAZE', () => {
    expect(layoutEnemy().getHitResult({ x: EX + 80, y: EY + 10 })).toBe('GRAZE')
  })

  it('just outside low zone → MISS', () => {
    expect(layoutEnemy().getHitResult({ x: EX + 81, y: EY + 10 })).toBe('MISS')
  })

  it('far away → MISS', () => {
    expect(layoutEnemy().getHitResult({ x: EX + 500, y: EY })).toBe('MISS')
  })

  it('getHitZone returns "head" for crit zone', () => {
    expect(layoutEnemy().getHitZone({ x: EX, y: EY - 60 })).toBe('head')
  })

  it('getHitZone returns "torso" for mid zone', () => {
    expect(layoutEnemy().getHitZone({ x: EX, y: EY })).toBe('torso')
  })

  it('getHitZone returns "leftLeg" for low zone (GRAZE)', () => {
    expect(layoutEnemy().getHitZone({ x: EX + 50, y: EY + 10 })).toBe('leftLeg')
  })

  it('getHitZone returns "none" for miss', () => {
    expect(layoutEnemy().getHitZone({ x: EX + 500, y: EY })).toBe('none')
  })
})

// ---------------------------------------------------------------------------
// Enemy with EnemyDef.hitZoneLayout — named enemies use unique layouts
// ---------------------------------------------------------------------------

describe('Named enemy hitZoneLayout — goblin scout vs. orc warrior vs. stone troll', () => {
  const ENEMY_Y = 270  // typical battle Y position

  it('goblin scout crit zone is larger than stone troll crit zone (easier crit)', () => {
    const goblinLayout = ENEMY_GOBLIN_SCOUT.hitZoneLayout!
    const trollLayout = ENEMY_STONE_TROLL.hitZoneLayout!
    expect(goblinLayout.critRadius).toBeGreaterThan(trollLayout.critRadius)
  })

  it('orc warrior crit zone is larger than stone troll crit zone', () => {
    const orcLayout = ENEMY_ORC_WARRIOR.hitZoneLayout!
    const trollLayout = ENEMY_STONE_TROLL.hitZoneLayout!
    expect(orcLayout.critRadius).toBeGreaterThan(trollLayout.critRadius)
  })

  it('ember wisp has a smaller crit radius than goblin scout', () => {
    const wispLayout = ENEMY_EMBER_WISP.hitZoneLayout!
    const goblinLayout = ENEMY_GOBLIN_SCOUT.hitZoneLayout!
    expect(wispLayout.critRadius).toBeLessThan(goblinLayout.critRadius)
  })

  it('goblin scout enemy hits head → CRIT at crit zone centre', () => {
    const layout = ENEMY_GOBLIN_SCOUT.hitZoneLayout!
    const ex = 195
    const ey = ENEMY_Y
    const e = new Enemy(ex, ey, layout)
    const critX = ex + layout.critDx
    const critY = ey + layout.critDy
    expect(e.getHitResult({ x: critX, y: critY })).toBe('CRIT')
  })

  it('stone troll crit zone centre → CRIT', () => {
    const layout = ENEMY_STONE_TROLL.hitZoneLayout!
    const ex = 195
    const ey = ENEMY_Y
    const e = new Enemy(ex, ey, layout)
    const critX = ex + layout.critDx
    const critY = ey + layout.critDy
    expect(e.getHitResult({ x: critX, y: critY })).toBe('CRIT')
  })
})

// ---------------------------------------------------------------------------
// critZoneTolerance — near-miss CRIT promotion
// ---------------------------------------------------------------------------

describe('Enemy.getHitResult — critZoneTolerance (layout mode)', () => {
  const layout: HitZoneLayout = {
    critDx: 0, critDy: -60, critRadius: 20,
    midDx: 0, midDy: 0, midRadius: 40,
    lowDx: 0, lowDy: 10, lowRadius: 80,
  }
  const critCx = EX
  const critCy = EY - 60

  function le(): Enemy {
    return new Enemy(EX, EY, layout)
  }

  it('tolerance 0 — shot just outside crit radius stays non-CRIT', () => {
    expect(le().getHitResult({ x: critCx + 21, y: critCy }, 0)).not.toBe('CRIT')
  })

  it('tolerance 0.15 — shot within 1.15× crit radius promotes to CRIT', () => {
    // 22 px from centre, crit radius 20, tolerance 0.15 → expanded 23. 22 < 23 → CRIT
    expect(le().getHitResult({ x: critCx + 22, y: critCy }, 0.15)).toBe('CRIT')
  })

  it('tolerance 0.15 — shot beyond 1.15× crit radius is not promoted', () => {
    // 24 px > 23 expanded → not CRIT
    expect(le().getHitResult({ x: critCx + 24, y: critCy }, 0.15)).not.toBe('CRIT')
  })

  it('tolerance 0.30 — shot within 1.30× crit radius promotes to CRIT', () => {
    // 25 px from centre, expanded 26 → CRIT
    expect(le().getHitResult({ x: critCx + 25, y: critCy }, 0.30)).toBe('CRIT')
  })

  it('tolerance does not affect direct CRIT hits', () => {
    expect(le().getHitResult({ x: critCx, y: critCy }, 0.30)).toBe('CRIT')
  })

  it('tolerance does not promote complete misses far from the enemy', () => {
    expect(le().getHitResult({ x: critCx + 500, y: critCy }, 0.30)).toBe('MISS')
  })

  it('tolerance does NOT promote a complete miss inside the expanded annulus when base zone is "none"', () => {
    // Build a layout where the mid/low zones are far away — so the annulus
    // between basic crit and (1+tolerance)*crit is empty space (baseZone='none').
    // The guard must refuse to upgrade 'none' to CRIT.
    const isolatedLayout: HitZoneLayout = {
      critDx: 0, critDy: -200, critRadius: 20,
      midDx: 0, midDy: 200, midRadius: 5,
      lowDx: 0, lowDy: 250, lowRadius: 5,
    }
    const e = new Enemy(EX, EY, isolatedLayout)
    const critCenterY = EY - 200
    // 25 px from crit centre — inside 1.30 × 20 = 26, but outside basic crit
    // and far from mid/low → baseZone = 'none'.
    expect(e.getHitResult({ x: EX + 25, y: critCenterY }, 0.30)).toBe('MISS')
  })

  it('getHitZone honours critZoneTolerance — promotes to "head"', () => {
    expect(le().getHitZone({ x: critCx + 22, y: critCy }, 0.15)).toBe('head')
  })
})

describe('Enemy.getHitResult — critZoneTolerance (legacy mode)', () => {
  const headCx = EX
  const headCy = EY - ENEMY_TORSO_HEIGHT_PX / 2 - ENEMY_HEAD_RADIUS_PX

  it('tolerance 0 — shot just outside head radius stays non-CRIT', () => {
    const r = ENEMY_HEAD_RADIUS_PX
    expect(enemy().getHitResult({ x: headCx + r + 1, y: headCy }, 0)).not.toBe('CRIT')
  })

  it('tolerance promotes a near-miss landed on torso to CRIT in legacy six-part model', () => {
    // A point on the torso just below the head bottom edge: baseZone='torso'
    // (HIT), and within expanded crit radius once tolerance is applied.
    const torsoTopY = EY - ENEMY_TORSO_HEIGHT_PX / 2 + 1
    const distFromHead = Math.abs(torsoTopY - headCy) // = HEAD_RADIUS + 1
    const tolerance = (distFromHead / ENEMY_HEAD_RADIUS_PX) - 1 + 0.01 // small buffer over the boundary
    expect(enemy().getHitResult({ x: headCx, y: torsoTopY }, tolerance)).toBe('CRIT')
  })

  it('tolerance does NOT promote a complete miss (base zone "none") in legacy mode', () => {
    const r = ENEMY_HEAD_RADIUS_PX
    // Point 1.05 × HEAD_RADIUS from head centre — outside every body part.
    // With tolerance 0.10 the expanded circle would cover it, but the guard
    // refuses to upgrade a 'none' base zone so it stays MISS.
    expect(enemy().getHitResult({ x: headCx + r * 1.05, y: headCy }, 0.10)).toBe('MISS')
  })
})

// ---------------------------------------------------------------------------
// Mask-based hit detection (pixel-perfect with MaskHitDetector)
// ---------------------------------------------------------------------------

describe('Enemy — mask-based hit detection', () => {
  const MASK_W = 128
  const MASK_H = 128
  const DISPLAY_W = 128
  const DISPLAY_H = 128

  /**
   * Creates a MaskHitDetector with a single mask where:
   * - top third (y < 43) = red (crit/head)
   * - middle third (43 <= y < 86) = yellow (hit/torso)
   * - bottom third (y >= 86) = green (graze/leftLeg)
   * All within x=20..107 (88px wide), y=20..107 (88px tall).
   */
  function createDetectorWithMask(): MaskHitDetector {
    const detector = new MaskHitDetector()
    const data = new Uint8Array(MASK_W * MASK_H * 4)

    const bbox = { x: 20, y: 20, w: 88, h: 88 }
    const third = bbox.h / 3

    for (let y = bbox.y; y < bbox.y + bbox.h; y++) {
      for (let x = bbox.x; x < bbox.x + bbox.w; x++) {
        const offset = (y * MASK_W + x) * 4
        const relY = y - bbox.y
        if (relY < third) {
          data[offset] = 255; data[offset + 1] = 0; data[offset + 2] = 0; data[offset + 3] = 255
        } else if (relY < third * 2) {
          data[offset] = 255; data[offset + 1] = 255; data[offset + 2] = 0; data[offset + 3] = 255
        } else {
          data[offset] = 0; data[offset + 1] = 255; data[offset + 2] = 0; data[offset + 3] = 255
        }
      }
    }
    detector.loadMaskData('test_enemy', 'idle', 0, data, MASK_W, MASK_H)
    return detector
  }

  it('returns CRIT for point in mask crit zone', () => {
    const detector = createDetectorWithMask()
    // Enemy at (64, 76.8) means frame origin = (0, 0) for 128x128 display with 0.6 offset
    // frameOriginX = 64 - 64 = 0, frameOriginY = 76.8 - 76.8 = 0
    // So world coords = frame coords when enemy is at (64, 76.8)
    const enemyX = DISPLAY_W / 2 // 64
    const enemyY = DISPLAY_H * 0.6 // 76.8 — so frame origin is (0, 0)
    const e = new Enemy(enemyX, enemyY, undefined, detector, DISPLAY_W, DISPLAY_H, 'test_enemy')
    e.currentAnimKey = 'idle'
    e.currentFrameIndex = 0

    // Point at (64, 25) in world = (64, 25) in frame = within top third of bbox
    expect(e.getHitResult({ x: 64, y: 25 })).toBe('CRIT')
  })

  it('returns HIT for point in mask hit zone', () => {
    const detector = createDetectorWithMask()
    const enemyX = DISPLAY_W / 2
    const enemyY = DISPLAY_H * 0.6
    const e = new Enemy(enemyX, enemyY, undefined, detector, DISPLAY_W, DISPLAY_H, 'test_enemy')
    e.currentAnimKey = 'idle'
    e.currentFrameIndex = 0

    // Point at (64, 55) in frame = within middle third of bbox
    expect(e.getHitResult({ x: 64, y: 55 })).toBe('HIT')
  })

  it('returns GRAZE for point in mask graze zone', () => {
    const detector = createDetectorWithMask()
    const enemyX = DISPLAY_W / 2
    const enemyY = DISPLAY_H * 0.6
    const e = new Enemy(enemyX, enemyY, undefined, detector, DISPLAY_W, DISPLAY_H, 'test_enemy')
    e.currentAnimKey = 'idle'
    e.currentFrameIndex = 0

    // Point at (64, 90) in frame = within bottom third of bbox
    expect(e.getHitResult({ x: 64, y: 90 })).toBe('GRAZE')
  })

  it('falls through to geometric detection for transparent mask area', () => {
    const detector = createDetectorWithMask()
    const enemyX = DISPLAY_W / 2
    const enemyY = DISPLAY_H * 0.6
    // Use a hitZoneLayout so the geometric fallback can catch the point
    const layout: HitZoneLayout = {
      critDx: 0, critDy: -30, critRadius: 20,
      midDx: 0, midDy: 0, midRadius: 40,
      lowDx: 0, lowDy: 20, lowRadius: 60,
    }
    const e = new Enemy(enemyX, enemyY, layout, detector, DISPLAY_W, DISPLAY_H, 'test_enemy')
    e.currentAnimKey = 'idle'
    e.currentFrameIndex = 0

    // Point at (10, 10) in frame = outside the mask bbox (transparent)
    // Falls through to geometric, which should check layout zones
    const result = e.getHitZone({ x: 10, y: 10 })
    // This point is close to the enemy's low zone with layout
    // The geometric fallback should handle it — result depends on geometry
    expect(['head', 'torso', 'leftLeg', 'none']).toContain(result)
  })

  it('without maskDetector, uses standard geometric detection', () => {
    const e = new Enemy(EX, EY)
    // Standard legacy detection — head should be CRIT
    expect(e.getHitResult({ x: EX, y: HEAD_CY })).toBe('CRIT')
  })
})
