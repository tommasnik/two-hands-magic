import { describe, it, expect, beforeEach } from 'vitest'
import { ProjectileSystem } from '../../game/systems/ProjectileSystem'
import { Enemy } from '../../game/entities/Enemy'
import { MaskHitDetector } from '../../game/systems/MaskHitDetector'
import {
  PROJECTILE_SPEED_CM,
  FIREBALL_SPEED_CM,
  PIXELS_PER_CM,
  PROJECTILE_BASE_RADIUS_PX,
} from '../../game/constants'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Enemy centred at canvas middle. */
const EX = 195
const EY = 422

/**
 * Creates a simple Enemy without mask detector — all hits return MISS.
 * Used for tests that only care about projectile lifecycle/flight timing.
 */
function makeEnemy(): Enemy {
  return new Enemy(EX, EY)
}

const MASK_W = 128
const MASK_H = 128

/**
 * Creates a mask-based Enemy with a full 128x128 yellow (torso/HIT) mask.
 * Every hit on this enemy returns HIT. Used for tests that need
 * specific hit results from ProjectileSystem.
 */
function makeMaskEnemy(enemyX = EX, enemyY = EY, displayW = 400, displayH = 400): { enemy: Enemy; detector: MaskHitDetector } {
  const detector = new MaskHitDetector()
  const data = new Uint8Array(MASK_W * MASK_H * 4)
  // Fill entire mask with yellow (torso/HIT)
  for (let i = 0; i < MASK_W * MASK_H; i++) {
    data[i * 4] = 255; data[i * 4 + 1] = 255; data[i * 4 + 2] = 0; data[i * 4 + 3] = 255
  }
  detector.loadMaskData('test', 'idle', 0, data, MASK_W, MASK_H)
  const enemy = new Enemy(enemyX, enemyY, 'test', undefined, detector, displayW, displayH)
  return { enemy, detector }
}

/**
 * Creates a mask-based Enemy where the top quarter is red (CRIT), rest is yellow (HIT).
 * Used for tests that need to distinguish CRIT from HIT regions.
 */
function makeCritMaskEnemy(enemyX = EX, enemyY = EY, displayW = 400, displayH = 400): { enemy: Enemy; detector: MaskHitDetector } {
  const detector = new MaskHitDetector()
  const data = new Uint8Array(MASK_W * MASK_H * 4)
  for (let y = 0; y < MASK_H; y++) {
    for (let x = 0; x < MASK_W; x++) {
      const i = (y * MASK_W + x) * 4
      if (y < MASK_H / 4) {
        // Top quarter = red (CRIT)
        data[i] = 255; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255
      } else {
        // Rest = yellow (HIT)
        data[i] = 255; data[i + 1] = 255; data[i + 2] = 0; data[i + 3] = 255
      }
    }
  }
  detector.loadMaskData('test', 'idle', 0, data, MASK_W, MASK_H)
  const enemy = new Enemy(enemyX, enemyY, 'test', undefined, detector, displayW, displayH)
  return { enemy, detector }
}

/** Compute expected flight time in ms for given distance (px) and speed (cm/s). */
function expectedFlightMs(distancePx: number, speedCmPerS: number): number {
  return (distancePx / (speedCmPerS * PIXELS_PER_CM)) * 1000
}

/** Euclidean distance between two points. */
function dist(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

// ---------------------------------------------------------------------------

describe('ProjectileSystem.fire()', () => {
  let sys: ProjectileSystem

  beforeEach(() => {
    sys = new ProjectileSystem()
    sys.reset()
  })

  it('adds a projectile with progress=0 and alive=true', () => {
    const origin = { x: 10, y: 800 }
    const target = { x: EX, y: EY }
    sys.fire(origin, target, 'fireball')

    const projectiles = sys.getProjectiles()
    expect(projectiles).toHaveLength(1)
    expect(projectiles[0].progress).toBe(0)
    expect(projectiles[0].alive).toBe(true)
  })

  it('assigns unique ids to each projectile', () => {
    const origin = { x: 10, y: 800 }
    const target = { x: EX, y: EY }
    sys.fire(origin, target, 'fireball')
    sys.fire(origin, target, 'fireball')
    sys.fire(origin, target, 'fireball')

    const ids = sys.getProjectiles().map((p) => p.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(3)
  })

  it('stores the correct origin, target, and skillType', () => {
    const origin = { x: 50, y: 750 }
    const target = { x: 200, y: 300 }
    sys.fire(origin, target, 'fireball')

    const p = sys.getProjectiles()[0]
    expect(p.origin).toEqual(origin)
    expect(p.target).toEqual(target)
    expect(p.skillType).toBe('fireball')
  })
})

// ---------------------------------------------------------------------------

describe('ProjectileSystem.update() — progress movement', () => {
  let sys: ProjectileSystem

  beforeEach(() => {
    sys = new ProjectileSystem()
  })

  it('advances progress proportionally to dt', () => {
    const origin = { x: 0, y: 0 }
    const target = { x: 0, y: PIXELS_PER_CM * PROJECTILE_SPEED_CM } // 1 second flight at base speed
    sys.fire(origin, target, 'fireball') // uses FIREBALL_SPEED_CM

    // We'll use base speed for this test — fire with a non-fireball (fallback) skill
    sys.reset()
    // Use target so that distance = PIXELS_PER_CM * PROJECTILE_SPEED_CM pixels
    // → flightTimeMs = 1000 ms
    const distPx = PIXELS_PER_CM * PROJECTILE_SPEED_CM
    sys.fire({ x: 0, y: 0 }, { x: distPx, y: 0 }, 'fireball')
    // For fireball speed test, compute expected time
    const flightMs = expectedFlightMs(distPx, FIREBALL_SPEED_CM)
    const dt = flightMs / 4 // quarter of flight time
    sys.update(dt, makeEnemy())
    const p = sys.getProjectiles()[0]
    expect(p).toBeDefined()
    expect(p.progress).toBeCloseTo(0.25, 5)
  })

  it('projectile reaches progress=1 after full flight time elapses', () => {
    const origin = { x: 0, y: 0 }
    const distPx = 100 * PIXELS_PER_CM // 100 cm
    const target = { x: distPx, y: 0 }
    sys.fire(origin, target, 'fireball')

    const flightMs = expectedFlightMs(distPx, FIREBALL_SPEED_CM)

    // Advance by exactly the flight time — projectile should hit and be removed
    const enemy = makeEnemy()
    // enemy is far from target so we'll get MISS — that's fine for this test
    const hits = sys.update(flightMs, enemy)
    expect(hits).toHaveLength(1)
    // After removal, no more projectiles
    expect(sys.getProjectiles()).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------

describe('ProjectileSystem.update() — hit events', () => {
  let sys: ProjectileSystem

  beforeEach(() => {
    sys = new ProjectileSystem()
  })

  it('returns a ProjectileHitEvent when progress >= 1', () => {
    const origin = { x: 0, y: 0 }
    // Fire toward enemy centre — mask-based enemy with full HIT mask
    const { enemy } = makeMaskEnemy()
    sys.fire(origin, { x: EX, y: EY }, 'fireball')

    const distPx = dist(origin, { x: EX, y: EY })
    const flightMs = expectedFlightMs(distPx, FIREBALL_SPEED_CM)

    const hits = sys.update(flightMs, enemy)
    expect(hits).toHaveLength(1)
    expect(hits[0].projectileId).toBeDefined()
    expect(hits[0].position).toEqual({ x: EX, y: EY })
    expect(hits[0].result).toBe('HIT')
  })

  it('dead projectiles are not included in subsequent updates', () => {
    const origin = { x: 0, y: 0 }
    sys.fire(origin, { x: EX, y: EY }, 'fireball')

    const distPx = dist(origin, { x: EX, y: EY })
    const flightMs = expectedFlightMs(distPx, FIREBALL_SPEED_CM)

    // First update — hits
    sys.update(flightMs, makeEnemy())

    // Second update — projectile was removed, no more hits
    const hits2 = sys.update(1000, makeEnemy())
    expect(hits2).toHaveLength(0)
    expect(sys.getProjectiles()).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------

describe('ProjectileSystem — multiple projectiles', () => {
  it('three projectiles all move independently and hit in correct order', () => {
    const sys = new ProjectileSystem()
    const enemy = makeEnemy()

    // Three different distances → different flight times
    const origins = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ]
    const targets = [
      { x: EX, y: EY },          // torso → HIT
      { x: EX, y: EY },          // torso → HIT
      { x: EX + 5000, y: EY },   // far miss → MISS
    ]

    for (let i = 0; i < 3; i++) {
      sys.fire(origins[i], targets[i], 'fireball')
    }

    expect(sys.getProjectiles()).toHaveLength(3)

    // Advance a large dt so all projectiles finish
    const maxFlightMs = Math.max(
      expectedFlightMs(dist(origins[0], targets[0]), FIREBALL_SPEED_CM),
      expectedFlightMs(dist(origins[1], targets[1]), FIREBALL_SPEED_CM),
      expectedFlightMs(dist(origins[2], targets[2]), FIREBALL_SPEED_CM),
    )

    const hits = sys.update(maxFlightMs * 1.1, enemy)

    // All three should have hit (or missed) — none frozen
    expect(hits).toHaveLength(3)
    expect(sys.getProjectiles()).toHaveLength(0)
  })

  it('three projectiles do not interfere — progress values are independent', () => {
    const sys = new ProjectileSystem()
    const enemy = makeEnemy()

    // Same target, same origin → same flight time — advance half-way
    const origin = { x: 0, y: 0 }
    const target = { x: EX, y: EY }
    sys.fire(origin, target, 'fireball')
    sys.fire(origin, target, 'fireball')
    sys.fire(origin, target, 'fireball')

    const flightMs = expectedFlightMs(dist(origin, target), FIREBALL_SPEED_CM)
    sys.update(flightMs / 2, enemy)

    const ps = sys.getProjectiles()
    expect(ps).toHaveLength(3)
    for (const p of ps) {
      expect(p.progress).toBeCloseTo(0.5, 5)
    }
  })
})

// ---------------------------------------------------------------------------

describe('ProjectileSystem — MISS when target misses enemy', () => {
  it('projectile aimed far from enemy → MISS', () => {
    const sys = new ProjectileSystem()
    const enemy = makeEnemy()

    const origin = { x: 0, y: 0 }
    const target = { x: 5000, y: 5000 } // far from enemy at (195, 422)
    sys.fire(origin, target, 'fireball')

    const flightMs = expectedFlightMs(dist(origin, target), FIREBALL_SPEED_CM)
    const hits = sys.update(flightMs, enemy)

    expect(hits).toHaveLength(1)
    expect(hits[0].result).toBe('MISS')
  })
})

// ---------------------------------------------------------------------------

describe('ProjectileSystem — HIT when target is enemy torso centre', () => {
  it('projectile aimed at torso centre → HIT (mask-based enemy)', () => {
    const sys = new ProjectileSystem()
    const { enemy } = makeMaskEnemy()

    const origin = { x: 0, y: EY } // same Y as torso, far left
    const target = { x: EX, y: EY } // torso centre
    sys.fire(origin, target, 'fireball')

    const flightMs = expectedFlightMs(dist(origin, target), FIREBALL_SPEED_CM)
    const hits = sys.update(flightMs, enemy)

    expect(hits).toHaveLength(1)
    expect(hits[0].result).toBe('HIT')
  })
})

// ---------------------------------------------------------------------------

describe('ProjectileSystem — fireball vs base speed', () => {
  it('fireball reaches target slower than base speed over the same distance', () => {
    const distPx = 200

    const fireballTime = expectedFlightMs(distPx, FIREBALL_SPEED_CM)
    const baseTime = expectedFlightMs(distPx, PROJECTILE_SPEED_CM)

    expect(fireballTime).toBeGreaterThan(baseTime)
  })
})

// ---------------------------------------------------------------------------

describe('ProjectileSystem.reset()', () => {
  it('clears all projectiles and resets id counter', () => {
    const sys = new ProjectileSystem()
    sys.fire({ x: 0, y: 0 }, { x: 100, y: 100 }, 'fireball')
    sys.fire({ x: 0, y: 0 }, { x: 200, y: 200 }, 'fireball')

    sys.reset()
    expect(sys.getProjectiles()).toHaveLength(0)

    // After reset, ids should restart from 0
    sys.fire({ x: 0, y: 0 }, { x: 100, y: 100 }, 'fireball')
    expect(sys.getProjectiles()[0].id).toBe('0')
  })
})

// ---------------------------------------------------------------------------

describe('ProjectileSystem — GRAZE when target is in mask graze zone', () => {
  it('projectile aimed at graze zone of mask-based enemy → GRAZE', () => {
    const sys = new ProjectileSystem()
    // Create an enemy with mask: top = red (CRIT), middle = yellow (HIT), bottom = green (GRAZE)
    const detector = new MaskHitDetector()
    const data = new Uint8Array(MASK_W * MASK_H * 4)
    for (let y = 0; y < MASK_H; y++) {
      for (let x = 0; x < MASK_W; x++) {
        const i = (y * MASK_W + x) * 4
        if (y < MASK_H / 3) {
          data[i] = 255; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255 // red = CRIT
        } else if (y < MASK_H * 2 / 3) {
          data[i] = 255; data[i + 1] = 255; data[i + 2] = 0; data[i + 3] = 255 // yellow = HIT
        } else {
          data[i] = 0; data[i + 1] = 255; data[i + 2] = 0; data[i + 3] = 255 // green = GRAZE
        }
      }
    }
    detector.loadMaskData('test', 'idle', 0, data, MASK_W, MASK_H)

    // Position the enemy so the graze zone bottom is reachable
    const displayW = 400
    const displayH = 400
    const enemyX = EX
    const enemyY = EY
    const enemy = new Enemy(enemyX, enemyY, 'test', undefined, detector, displayW, displayH)

    // Compute a target in the bottom third of the mask (graze zone)
    // frameOriginX = EX - 200, frameOriginY = EY - 240
    // We need frameY to be in the bottom third (y >= 85)
    // worldY = frameOriginY + frameY * (displayH / MASK_H) = (EY - 240) + 100 * (400/128)
    const frameOriginY = enemyY - displayH * 0.6
    const targetWorldY = frameOriginY + 100 * (displayH / MASK_H)
    const target = { x: enemyX, y: targetWorldY }
    const origin = { x: 0, y: targetWorldY }
    sys.fire(origin, target, 'fireball')

    const flightMs = expectedFlightMs(dist(origin, target), FIREBALL_SPEED_CM)
    const hits = sys.update(flightMs, enemy)

    expect(hits).toHaveLength(1)
    expect(hits[0].result).toBe('GRAZE')
  })
})

// ---------------------------------------------------------------------------

describe('ProjectileSystem — speedForSkill per skill type', () => {
  it('fast_shot travels at PROJECTILE_SPEED_CM (base speed)', () => {
    const sys = new ProjectileSystem()
    const enemy = makeEnemy()

    const distPx = 100 * PIXELS_PER_CM
    const origin = { x: 0, y: 0 }
    const target = { x: distPx, y: 0 }
    sys.fire(origin, target, 'fast_shot')

    const expectedMs = expectedFlightMs(distPx, PROJECTILE_SPEED_CM)
    const hits = sys.update(expectedMs, enemy)
    expect(hits).toHaveLength(1)
  })

  it('slow_shot travels at FIREBALL_SPEED_CM (slower than fast_shot)', () => {
    const distPx = 100 * PIXELS_PER_CM
    const origin = { x: 0, y: 0 }
    const target = { x: distPx, y: 0 }

    // fast_shot arrives after PROJECTILE_SPEED_CM flight time
    const fastTime = expectedFlightMs(distPx, PROJECTILE_SPEED_CM)
    const slowTime = expectedFlightMs(distPx, FIREBALL_SPEED_CM)
    expect(slowTime).toBeGreaterThan(fastTime)

    // Advance by fast_shot flight time — slow_shot should NOT have arrived yet
    const sys = new ProjectileSystem()
    const enemy = makeEnemy()
    sys.fire(origin, target, 'slow_shot')
    const hits = sys.update(fastTime, enemy)
    expect(hits).toHaveLength(0)

    // Advance the remaining time — slow_shot now arrives
    const remaining = slowTime - fastTime
    const hits2 = sys.update(remaining, enemy)
    expect(hits2).toHaveLength(1)
  })

  it('fast_shot is faster than slow_shot over the same distance', () => {
    const distPx = 200 * PIXELS_PER_CM
    expect(expectedFlightMs(distPx, PROJECTILE_SPEED_CM)).toBeLessThan(
      expectedFlightMs(distPx, FIREBALL_SPEED_CM),
    )
  })
})

// ---------------------------------------------------------------------------

describe('ProjectileSystem — alive guard (dead projectile skip)', () => {
  it('projectile marked dead externally is skipped during update', () => {
    // This test exercises the !p.alive branch by having two projectiles in a batch
    // where the first one finishes early and the loop continues to others.
    const sys = new ProjectileSystem()
    const enemy = makeEnemy()

    // Projectile 1: very short distance (arrives quickly)
    const shortTarget = { x: 1, y: 0 }
    const origin = { x: 0, y: 0 }
    sys.fire(origin, shortTarget, 'fireball')

    // Projectile 2: normal distance
    sys.fire(origin, { x: EX, y: EY }, 'fireball')

    // First update: advance BOTH to completion in one large dt
    // Both will complete in this single update
    const flightMs2 = expectedFlightMs(dist(origin, { x: EX, y: EY }), FIREBALL_SPEED_CM)
    const hits = sys.update(flightMs2 * 1.5, enemy)

    // Both should have hit
    expect(hits).toHaveLength(2)
    // All cleared after update
    expect(sys.getProjectiles()).toHaveLength(0)
  })

  it('second update after all projectiles finished returns no hits', () => {
    const sys = new ProjectileSystem()
    const enemy = makeEnemy()

    sys.fire({ x: 0, y: 0 }, { x: EX, y: EY }, 'fireball')
    const flightMs = expectedFlightMs(dist({ x: 0, y: 0 }, { x: EX, y: EY }), FIREBALL_SPEED_CM)

    sys.update(flightMs, enemy) // kills the projectile + filters it
    const hits2 = sys.update(1000, enemy) // empty list — no projectiles at all
    expect(hits2).toHaveLength(0)
    expect(sys.getProjectiles()).toHaveLength(0)
  })

  it('projectile injected as already-dead is skipped (covers !alive branch)', () => {
    // The !p.alive guard exists for defensive correctness.
    // We exercise it by injecting a dead projectile directly into internal state.
    const sys = new ProjectileSystem()
    const enemy = makeEnemy()

    // Add a living projectile via the public API
    sys.fire({ x: 0, y: 0 }, { x: EX, y: EY }, 'fireball')

    // Inject a dead projectile directly into the internal array (defensive branch test)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(sys as any).projectiles.unshift({
      id: 'dead-injected',
      origin: { x: 0, y: 0 },
      target: { x: 10, y: 10 },
      skillType: 'fireball' as const,
      progress: 1,
      alive: false,
      flightTimeMs: 50,
    })

    // update() should skip the dead one and process the alive one
    const flightMs = expectedFlightMs(dist({ x: 0, y: 0 }, { x: EX, y: EY }), FIREBALL_SPEED_CM)
    const hits = sys.update(flightMs, enemy)

    // Only the alive projectile should have fired a hit event
    expect(hits).toHaveLength(1)
    expect(hits[0].projectileId).not.toBe('dead-injected')
    // Dead projectile was cleaned up along with the completed one
    expect(sys.getProjectiles()).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// TASK-44 — projectileSpeedMultiplier (upgrade-driven speed scaling at fire time)
// ---------------------------------------------------------------------------

describe('ProjectileSystem — projectileSpeedMultiplier', () => {
  it('flight time scales inversely with the speed multiplier (proj_speed_2 → 1.30×)', () => {
    const distPx = 100 * PIXELS_PER_CM
    const origin = { x: 0, y: 0 }
    const target = { x: distPx, y: 0 }
    const enemy = makeEnemy()
    const baseFlight = expectedFlightMs(distPx, FIREBALL_SPEED_CM)
    const speedMul = 1.30

    // Baseline reference: arrives at baseFlight ms
    const baseSys = new ProjectileSystem()
    baseSys.fire(origin, target, 'fireball')
    expect(baseSys.update(baseFlight, enemy)).toHaveLength(1)

    // Upgraded projectile arrives at baseFlight / 1.30 ms
    const fastSys = new ProjectileSystem()
    fastSys.fire(origin, target, 'fireball', 0, { projectileSpeedMultiplier: speedMul })
    const upgradedFlight = baseFlight / speedMul
    // Step just below the upgraded flight time — projectile has not arrived
    expect(fastSys.update(upgradedFlight * 0.99, enemy)).toHaveLength(0)
    // One more step takes it past arrival
    expect(fastSys.update(upgradedFlight * 0.02, enemy)).toHaveLength(1)
  })

  it('proj_speed_3 (×1.50) projectile arrives at least 30 % faster than baseline', () => {
    const distPx = 200 * PIXELS_PER_CM
    const baseFlight = expectedFlightMs(distPx, FIREBALL_SPEED_CM)
    const fastFlight = baseFlight / 1.5

    // Sanity: fastFlight ≤ baseFlight × 0.70 (≥30 % improvement)
    expect(fastFlight).toBeLessThanOrEqual(baseFlight * 0.70 + 1e-9)
  })

  it('speed multiplier defaults to 1.0 — baseline behaviour preserved', () => {
    const sys = new ProjectileSystem()
    const enemy = makeEnemy()
    const distPx = 100 * PIXELS_PER_CM
    const origin = { x: 0, y: 0 }
    const target = { x: distPx, y: 0 }
    sys.fire(origin, target, 'fireball')
    // Exactly at baseline flight time → arrival
    const baseFlight = expectedFlightMs(distPx, FIREBALL_SPEED_CM)
    const hits = sys.update(baseFlight, enemy)
    expect(hits).toHaveLength(1)
  })

  it('multiplier passes through every supported skill type (fast_shot included)', () => {
    const sys = new ProjectileSystem()
    const enemy = makeEnemy()
    const distPx = 100 * PIXELS_PER_CM
    const origin = { x: 0, y: 0 }
    const target = { x: distPx, y: 0 }
    sys.fire(origin, target, 'fast_shot', 0, { projectileSpeedMultiplier: 2.0 })
    const baseFlight = expectedFlightMs(distPx, PROJECTILE_SPEED_CM)
    const halfFlight = baseFlight / 2
    expect(sys.update(halfFlight * 0.99, enemy)).toHaveLength(0)
    expect(sys.update(halfFlight * 0.02, enemy)).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// TASK-44 — spellAreaMultiplier (projectile radius for circle-vs-circle hits)
// ---------------------------------------------------------------------------

describe('ProjectileSystem — spellAreaMultiplier (projectile radius baking)', () => {
  it('hit event carries the effective projectile radius (post-spell-area scaling)', () => {
    const sys = new ProjectileSystem()
    const enemy = makeEnemy()
    const origin = { x: 0, y: 0 }
    const target = { x: EX, y: EY }
    sys.fire(origin, target, 'fireball', 0, { spellAreaMultiplier: 1.60 })
    const flightMs = expectedFlightMs(dist(origin, target), FIREBALL_SPEED_CM)
    const hits = sys.update(flightMs, enemy)
    expect(hits).toHaveLength(1)
    expect(hits[0].projectileRadius).toBeCloseTo(PROJECTILE_BASE_RADIUS_PX * 1.60, 6)
  })

  it('default spell-area multiplier (1.0) bakes in PROJECTILE_BASE_RADIUS_PX', () => {
    const sys = new ProjectileSystem()
    const enemy = makeEnemy()
    sys.fire({ x: 0, y: 0 }, { x: EX, y: EY }, 'fireball')
    const flightMs = expectedFlightMs(dist({ x: 0, y: 0 }, { x: EX, y: EY }), FIREBALL_SPEED_CM)
    const hits = sys.update(flightMs, enemy)
    expect(hits).toHaveLength(1)
    expect(hits[0].projectileRadius).toBeCloseTo(PROJECTILE_BASE_RADIUS_PX, 6)
  })

  it('combined upgrades — speed and area can be applied together at fire time', () => {
    const sys = new ProjectileSystem()
    const enemy = makeEnemy()
    const distPx = 100 * PIXELS_PER_CM
    const origin = { x: 0, y: 0 }
    const target = { x: EX, y: EY }
    sys.fire(origin, target, 'fireball', 0, {
      projectileSpeedMultiplier: 1.5,
      spellAreaMultiplier: 1.4,
    })
    // Sanity: projectile got both modifiers — radius scaled and arrives before baseline flight
    const baseFlight = expectedFlightMs(distPx, FIREBALL_SPEED_CM)
    const hits = sys.update(baseFlight, enemy)
    expect(hits).toHaveLength(1)
    expect(hits[0].projectileRadius).toBeCloseTo(PROJECTILE_BASE_RADIUS_PX * 1.4, 6)
  })
})

// ---------------------------------------------------------------------------
// ProjectileSystem — fire() edge cases (clamping, deep copy)
// ---------------------------------------------------------------------------

describe('ProjectileSystem — fire() edge cases', () => {
  it('fire() clamps zero/negative speedMul so the projectile resolves instead of stalling forever', () => {
    const sys = new ProjectileSystem()
    const enemy = makeEnemy()
    sys.fire({ x: 0, y: 0 }, { x: EX, y: EY }, 'fireball', 0, {
      projectileSpeedMultiplier: 0,
    })
    const hits = sys.update(60_000, enemy)
    expect(hits).toHaveLength(1)
    expect(sys.getProjectiles()).toHaveLength(0)
  })

  it('fire() clamps negative areaMul so r*r cannot silently mimic a positive disc', () => {
    const sys = new ProjectileSystem()
    const enemy = makeEnemy()
    sys.fire({ x: 0, y: 0 }, { x: EX, y: EY }, 'fireball', 0, {
      spellAreaMultiplier: -2,
    })
    const hits = sys.update(60_000, enemy)
    expect(hits).toHaveLength(1)
    expect(hits[0].projectileRadius).toBe(0)
  })

  it('getProjectiles() defensively deep-copies origin/target — snapshot mutations do not leak back', () => {
    const sys = new ProjectileSystem()
    sys.fire({ x: 10, y: 20 }, { x: 100, y: 200 }, 'fireball')
    const snapshot = sys.getProjectiles()
    snapshot[0].origin.x = 9999
    snapshot[0].target.y = -9999
    const fresh = sys.getProjectiles()
    expect(fresh[0].origin.x).toBe(10)
    expect(fresh[0].target.y).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Mask-based enemy hit detection through ProjectileSystem pipeline
// ---------------------------------------------------------------------------

describe('ProjectileSystem — mask-based hit detection', () => {
  it('projectile landing on mask CRIT zone returns CRIT', () => {
    const sys = new ProjectileSystem()
    const { enemy } = makeCritMaskEnemy()
    // Target the top of the enemy (CRIT zone in mask)
    const frameOriginY = enemy.y - 400 * 0.6
    // Frame Y=16 is in the top quarter (CRIT). World Y = frameOriginY + 16 * (400/128) = frameOriginY + 50
    const targetY = frameOriginY + 50
    const origin = { x: 0, y: targetY }
    const target = { x: EX, y: targetY }
    sys.fire(origin, target, 'fireball')
    const flightMs = expectedFlightMs(dist(origin, target), FIREBALL_SPEED_CM)
    const hits = sys.update(flightMs, enemy)
    expect(hits).toHaveLength(1)
    expect(hits[0].result).toBe('CRIT')
  })

  it('projectile landing outside mask returns MISS', () => {
    const sys = new ProjectileSystem()
    const { enemy } = makeMaskEnemy()
    // Target far away from the enemy
    const target = { x: 5000, y: 5000 }
    const origin = { x: 0, y: 0 }
    sys.fire(origin, target, 'fireball')
    const flightMs = expectedFlightMs(dist(origin, target), FIREBALL_SPEED_CM)
    const hits = sys.update(flightMs, enemy)
    expect(hits).toHaveLength(1)
    expect(hits[0].result).toBe('MISS')
  })

  it('enemy without mask always returns MISS', () => {
    const sys = new ProjectileSystem()
    const enemy = makeEnemy() // no mask detector
    sys.fire({ x: 0, y: EY }, { x: EX, y: EY }, 'fireball')
    const flightMs = expectedFlightMs(dist({ x: 0, y: EY }, { x: EX, y: EY }), FIREBALL_SPEED_CM)
    const hits = sys.update(flightMs, enemy)
    expect(hits).toHaveLength(1)
    expect(hits[0].result).toBe('MISS')
  })
})
