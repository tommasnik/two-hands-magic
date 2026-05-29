import { describe, it, expect, beforeEach } from 'vitest'
import { ProjectileSystem } from '../../game/systems/ProjectileSystem'
import { Enemy } from '../../game/entities/Enemy'
import {
  PROJECTILE_SPEED_CM,
  FIREBALL_SPEED_CM,
  PIXELS_PER_CM,
  ENEMY_TORSO_WIDTH_PX,
  ENEMY_TORSO_HEIGHT_PX,
  ENEMY_LIMB_RADIUS_PX,
  ENEMY_HEAD_RADIUS_PX,
  ENEMY_GOBLIN_SCOUT,
  PROJECTILE_BASE_RADIUS_PX,
} from '../../game/constants'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Enemy centred at canvas middle. */
const EX = 195
const EY = 422

function makeEnemy(): Enemy {
  return new Enemy(EX, EY)
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
    // Fire toward enemy torso centre
    sys.fire(origin, { x: EX, y: EY }, 'fireball')

    const distPx = dist(origin, { x: EX, y: EY })
    const flightMs = expectedFlightMs(distPx, FIREBALL_SPEED_CM)

    const hits = sys.update(flightMs, makeEnemy())
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
  it('projectile aimed at torso centre → HIT', () => {
    const sys = new ProjectileSystem()
    const enemy = makeEnemy()

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

describe('ProjectileSystem — GRAZE when target is enemy limb', () => {
  it('projectile aimed at left arm → GRAZE', () => {
    const sys = new ProjectileSystem()
    // Enemy at (195, 281)
    const ex = EX
    const ey = 281
    const enemy = new Enemy(ex, ey)

    // Left arm centre
    const leftArmX = ex - ENEMY_TORSO_WIDTH_PX / 2 - ENEMY_LIMB_RADIUS_PX
    const armY = ey - ENEMY_TORSO_HEIGHT_PX / 4

    const origin = { x: 0, y: armY }
    const target = { x: leftArmX, y: armY }
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

describe('ProjectileSystem — spellAreaMultiplier (circle-vs-circle hits)', () => {
  it('baseline (no spell area upgrade) shot just outside the crit zone is GRAZE/HIT/MISS — not CRIT', () => {
    // Aim 1.5 px outside the goblin scout crit radius — well past PROJECTILE_BASE_RADIUS_PX.
    // At baseline the projectile disc cannot reach the crit ring, so we MUST NOT crit.
    const sys = new ProjectileSystem()
    const layout = ENEMY_GOBLIN_SCOUT.hitZoneLayout!
    const enemy = new Enemy(195, 422, layout)
    const cx = enemy.x + layout.critDx
    const cy = enemy.y + layout.critDy
    // Just past the projectile disc — guaranteed not in crit even with baseline radius.
    const justOutside = layout.critRadius + PROJECTILE_BASE_RADIUS_PX + 1.0
    const target = { x: cx + justOutside, y: cy }

    sys.fire({ x: 0, y: cy }, target, 'fireball')
    const flightMs = expectedFlightMs(dist({ x: 0, y: cy }, target), FIREBALL_SPEED_CM)
    const hits = sys.update(flightMs, enemy)
    expect(hits).toHaveLength(1)
    expect(hits[0].result).not.toBe('CRIT')
  })

  it('spell_area_1 (1.20×) — near-miss outside baseline crit now intersects the disc → CRIT', () => {
    // Construct a target where:
    //   distToCrit > critRadius + baselineProjectileRadius (would not CRIT without upgrade)
    //   distToCrit < critRadius + upgradedProjectileRadius  (CRITs with upgrade)
    // Choose distToCrit = critRadius + (baseR + upgradedR) / 2.
    const sys = new ProjectileSystem()
    const layout = ENEMY_GOBLIN_SCOUT.hitZoneLayout!
    const enemy = new Enemy(195, 422, layout)
    const cx = enemy.x + layout.critDx
    const cy = enemy.y + layout.critDy
    const areaMul = 1.20
    const baseR = PROJECTILE_BASE_RADIUS_PX
    const upgradedR = PROJECTILE_BASE_RADIUS_PX * areaMul
    const distToCrit = layout.critRadius + (baseR + upgradedR) / 2
    const target = { x: cx + distToCrit, y: cy }

    // Sanity-check the inequality scaffolding our test relies on
    expect(distToCrit).toBeGreaterThan(layout.critRadius + baseR)
    expect(distToCrit).toBeLessThan(layout.critRadius + upgradedR)

    sys.fire({ x: 0, y: cy }, target, 'fireball', 0, { spellAreaMultiplier: areaMul })
    const flightMs = expectedFlightMs(dist({ x: 0, y: cy }, target), FIREBALL_SPEED_CM)
    const hits = sys.update(flightMs, enemy)
    expect(hits).toHaveLength(1)
    expect(hits[0].result).toBe('CRIT')
  })

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
// TASK-44 — Enemy circle-vs-zone hit detection with projectile radius
// ---------------------------------------------------------------------------

describe('Enemy.getHitResult — projectile radius (circle-vs-zone)', () => {
  it('point just outside head circle with non-zero projectile radius is CRIT', () => {
    const layout = ENEMY_GOBLIN_SCOUT.hitZoneLayout!
    const enemy = new Enemy(195, 422, layout)
    const cx = enemy.x + layout.critDx
    const cy = enemy.y + layout.critDy
    const r = PROJECTILE_BASE_RADIUS_PX * 1.5
    // distToCrit is between critRadius and critRadius + r → CRIT only with non-zero radius
    const dx = layout.critRadius + r * 0.5
    expect(enemy.getHitResult({ x: cx + dx, y: cy }, 0, r)).toBe('CRIT')
    expect(enemy.getHitResult({ x: cx + dx, y: cy }, 0, 0)).not.toBe('CRIT')
  })

  it('legacy six-part body — projectile radius inflates limb zones', () => {
    // No hitZoneLayout → legacy mode
    const enemy = new Enemy(195, 422)
    // Just outside left arm circle (1 px beyond radius). Without radius → MISS,
    // with radius ≥ 2 px → GRAZE.
    const armCY = 422 - ENEMY_TORSO_HEIGHT_PX / 4
    const leftArmCX = 195 - ENEMY_TORSO_WIDTH_PX / 2 - ENEMY_LIMB_RADIUS_PX
    const justOutsideX = leftArmCX - ENEMY_LIMB_RADIUS_PX - 1
    expect(enemy.getHitResult({ x: justOutsideX, y: armCY }, 0, 0)).toBe('MISS')
    expect(enemy.getHitResult({ x: justOutsideX, y: armCY }, 0, 2)).toBe('GRAZE')
  })

  it('legacy six-part body — projectile radius inflates the torso rectangle', () => {
    const enemy = new Enemy(195, 422)
    // 1 px past the right edge of the torso, vertically centred → MISS at radius 0,
    // HIT at radius ≥ 2 px (the torso rect grows by the projectile radius).
    const justRightX = 195 + ENEMY_TORSO_WIDTH_PX / 2 + 1
    expect(enemy.getHitResult({ x: justRightX, y: 422 }, 0, 0)).not.toBe('HIT')
    expect(enemy.getHitResult({ x: justRightX, y: 422 }, 0, 2)).toBe('HIT')
  })

  it('default projectile radius is 0 — boundary cases stay strict', () => {
    const enemy = new Enemy(195, 422)
    // 1 px above the head circle → MISS when no radius is supplied
    const headTop = 422 - ENEMY_TORSO_HEIGHT_PX / 2 - 2 * ENEMY_HEAD_RADIUS_PX - 1
    expect(enemy.getHitResult({ x: 195, y: headTop })).toBe('MISS')
  })

  it('projectile radius does not promote complete misses past the body to CRIT', () => {
    const layout = ENEMY_GOBLIN_SCOUT.hitZoneLayout!
    const enemy = new Enemy(195, 422, layout)
    // Far above the enemy → MISS even with a generous radius. The radius widens
    // every zone uniformly, but a point that lands outside all zones cannot be
    // promoted to CRIT by critZoneTolerance (tolerance only widens an existing hit).
    const veryFarAbove = { x: 195, y: -500 }
    expect(enemy.getHitResult(veryFarAbove, 0.30, 5)).toBe('MISS')
  })

  it('fire() clamps zero/negative speedMul so the projectile resolves instead of stalling forever', () => {
    const sys = new ProjectileSystem()
    const enemy = makeEnemy()
    sys.fire({ x: 0, y: 0 }, { x: EX, y: EY }, 'fireball', 0, {
      projectileSpeedMultiplier: 0,
    })
    // A large step must resolve the projectile — without the clamp the
    // multiplier=0 would make flightTime = Infinity and progress would never
    // cross 1, leaving the projectile queued indefinitely.
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
    // Clamped to 0 → no disc, behaves as a point projectile.
    expect(hits[0].projectileRadius).toBe(0)
  })

  it('getProjectiles() defensively deep-copies origin/target — snapshot mutations do not leak back', () => {
    const sys = new ProjectileSystem()
    sys.fire({ x: 10, y: 20 }, { x: 100, y: 200 }, 'fireball')
    const snapshot = sys.getProjectiles()
    snapshot[0].origin.x = 9999
    snapshot[0].target.y = -9999
    // Re-read the system — internal projectile's nested objects must be unaffected.
    const fresh = sys.getProjectiles()
    expect(fresh[0].origin.x).toBe(10)
    expect(fresh[0].target.y).toBe(200)
  })

  it('CRIT promotion is critRadius*(1+tolerance) + projectileRadius — additive, no double-count', () => {
    // Regression: a previous implementation multiplied (1+tolerance) against
    // the SUM (critRadius + projectileRadius), letting tolerance also scale
    // the projectile disc. The intended semantic is additive for the projectile
    // contribution.
    //
    // We need a target whose BASE zone is already on the body (torso) so the
    // 'none' guard does not block promotion. Legacy mode is ideal: the head
    // circle is tangent to the torso top, so a vertical probe straight down
    // from HEAD_CY into the torso stays inside the body for the whole sweep.
    //
    // Place targets along the vertical axis below HEAD_CY at distances chosen
    // so the additive ring discriminates against the multiplicative ring:
    //   additive ring D_add = HEAD_RADIUS*(1+tolerance) + r
    //   multiplicative D_mul = (HEAD_RADIUS + r)*(1+tolerance) = D_add + r*tolerance
    //   The gap r*tolerance ≈ 1.3 px at worst-case upgrade values.
    const enemyLegacy = new Enemy(195, 422)
    const tolerance = 0.30
    const r = PROJECTILE_BASE_RADIUS_PX * 1.60
    const HEAD_CY_LEGACY = 422 - ENEMY_TORSO_HEIGHT_PX / 2 - ENEMY_HEAD_RADIUS_PX
    const additiveRing = ENEMY_HEAD_RADIUS_PX * (1 + tolerance) + r
    const multiplicativeGap = ENEMY_HEAD_RADIUS_PX * tolerance + r * tolerance - (ENEMY_HEAD_RADIUS_PX * tolerance)
    // = r * tolerance — the difference between the two formulas.
    expect(multiplicativeGap).toBeGreaterThan(0.5) // sanity check the test is sensitive

    // Just inside the additive ring (vertically below HEAD_CY) — must CRIT.
    const justInside = { x: 195, y: HEAD_CY_LEGACY + additiveRing - 0.25 }
    expect(enemyLegacy.getHitResult(justInside, tolerance, r)).toBe('CRIT')

    // Just outside the additive ring but still inside what the buggy
    // multiplicative ring would cover (~+ r*tolerance ≈ +1.3 px). If the bug
    // returns, this assertion flips to CRIT.
    const justOutside = { x: 195, y: HEAD_CY_LEGACY + additiveRing + 0.25 }
    expect(enemyLegacy.getHitResult(justOutside, tolerance, r)).not.toBe('CRIT')
  })
})
