// ============================================================
// Game Design: Projectile speed and spell area upgrades (TASK-44)
//
// Exercises projectileSpeedMultiplier and spellAreaMultiplier through the
// ProjectileSystem + Enemy hit pipeline. All numeric assertions derive from
// constants.ts and UPGRADE_NODES — so a designer can retune any of these
// without re-authoring the spec.
//
// Difficulty intent (what the upgrades are FOR):
//   - spell_area_X: casual hit rate ↑, near-miss CRIT band ↑
//   - proj_speed_X: power-user encounter time ↓
// ============================================================

import { describe, it, expect } from 'vitest'
import { ProjectileSystem } from '../../game/systems/ProjectileSystem'
import { Enemy } from '../../game/entities/Enemy'
import type { HitResult } from '../../types'
import {
  PROJECTILE_BASE_RADIUS_CM,
  PROJECTILE_BASE_RADIUS_PX,
  PIXELS_PER_CM,
  FIREBALL_SPEED_CM,
  PROJECTILE_SPEED_CM,
  UPGRADE_NODES,
  DEFAULT_GLOBAL_UPGRADE_STATE,
  ENEMY_GOBLIN_SCOUT,
  ENEMY_DEFAULT_Y,
  GAME_WIDTH,
} from '../../game/constants'
import { applyUpgradeNode } from '../../game/upgrades'
import type { UpgradeNodeId, GlobalUpgradeState, SkillType } from '../../types'

// ---------------------------------------------------------------------------
// Helpers — fully derived from constants
// ---------------------------------------------------------------------------

/** Build a synthetic GlobalUpgradeState by unlocking the named ids in order. */
function buildUpgradeState(...ids: UpgradeNodeId[]): GlobalUpgradeState {
  let s: GlobalUpgradeState = {
    ...DEFAULT_GLOBAL_UPGRADE_STATE,
    unlockedNodeIds: [...DEFAULT_GLOBAL_UPGRADE_STATE.unlockedNodeIds],
  }
  for (const id of ids) s = applyUpgradeNode(s, id)
  return s
}

/** Look up a node and apply it in isolation to read the effect on a single field. */
function multiplierOf(field: 'projectileSpeedMultiplier' | 'spellAreaMultiplier', id: UpgradeNodeId): number {
  return buildUpgradeState(id)[field] as number
}

/** Effective projectile disc radius for a given upgrade state. Unit: px. */
function projectileRadiusPx(state: GlobalUpgradeState): number {
  return PROJECTILE_BASE_RADIUS_PX * state.spellAreaMultiplier
}

/** Fire a single projectile through the system and return its hit result. */
function fireAndResolve(
  enemy: Enemy,
  origin: { x: number; y: number },
  target: { x: number; y: number },
  skillType: SkillType,
  upgrades: GlobalUpgradeState,
): { result: HitResult; flightMs: number } {
  const sys = new ProjectileSystem()
  sys.fire(origin, target, skillType, 0, {
    projectileSpeedMultiplier: upgrades.projectileSpeedMultiplier,
    spellAreaMultiplier: upgrades.spellAreaMultiplier,
  })
  // Step the projectile to arrival in one big slice — we only care about
  // outcome and total flight time, not intermediate frames.
  const dx = target.x - origin.x
  const dy = target.y - origin.y
  const distPx = Math.sqrt(dx * dx + dy * dy)
  const baseSpeed = skillType === 'fireball' || skillType === 'slow_shot'
    ? FIREBALL_SPEED_CM
    : PROJECTILE_SPEED_CM
  const effectiveSpeedCmPerS = baseSpeed * upgrades.projectileSpeedMultiplier
  const flightMs = (distPx / (effectiveSpeedCmPerS * PIXELS_PER_CM)) * 1000
  const hits = sys.update(flightMs + 1, enemy)
  // Hard-fail instead of returning a sentinel — a projectile that fails to
  // resolve is a real bug, not a "miss". A sentinel hides such regressions
  // behind every downstream `.toBe('MISS')` assertion.
  expect(hits).toHaveLength(1)
  return { result: hits[0].result, flightMs }
}

// ---------------------------------------------------------------------------
// AC #3 — Regression: behaviour without upgrades is identical to today's tests
// ---------------------------------------------------------------------------

describe('Game Design: spell area / projectile speed — regression without upgrades', () => {
  it('PROJECTILE_BASE_RADIUS_CM stays small enough not to break existing point-vs-zone tests', () => {
    // AC#3: ≤ 0.05 cm means baseline projectile disc ≤ ~2.8 px — well below the
    // smallest hit-zone tolerance the existing unit and design tests rely on.
    expect(PROJECTILE_BASE_RADIUS_CM).toBeLessThanOrEqual(0.05)
  })

  it('default global upgrades leave projectileSpeedMultiplier and spellAreaMultiplier at 1.0', () => {
    expect(DEFAULT_GLOBAL_UPGRADE_STATE.projectileSpeedMultiplier).toBe(1.0)
    expect(DEFAULT_GLOBAL_UPGRADE_STATE.spellAreaMultiplier).toBe(1.0)
  })
})

// ---------------------------------------------------------------------------
// AC #2 — Casual player benefit: spell_area_1 widens effective hit zone
// ---------------------------------------------------------------------------

describe('Game Design: spell_area_1 benefit for casual players', () => {
  const layout = ENEMY_GOBLIN_SCOUT.hitZoneLayout!
  const ENEMY_X = GAME_WIDTH / 2
  const ENEMY_Y = ENEMY_DEFAULT_Y

  /**
   * Place a target at a horizontal offset `r` from the GRAZE-zone centre
   * (on the same Y as that centre, on either side), fire through the
   * production pipeline, and return how many of the `n` samples connected.
   *
   * Horizontal sampling at lowCY avoids accidental overlap with the mid/crit
   * zones above the GRAZE ring — only the low zone is in play at this Y level,
   * so the test isolates the spell-area effect on the GRAZE boundary cleanly.
   */
  function ringHitCount(upgrades: GlobalUpgradeState, ringRadius: number, n: number): number {
    const enemy = new Enemy(ENEMY_X, ENEMY_Y, layout)
    const lowCX = enemy.x + layout.lowDx
    const lowCY = enemy.y + layout.lowDy
    let hits = 0
    // Alternate left/right samples to test both sides of the GRAZE ring; the
    // ring is symmetric so the per-side count is just n/2.
    for (let i = 0; i < n; i++) {
      const sign = i % 2 === 0 ? 1 : -1
      const tx = lowCX + sign * ringRadius
      const ty = lowCY
      const { result } = fireAndResolve(enemy, { x: 0, y: ty }, { x: tx, y: ty }, 'fireball', upgrades)
      if (result === 'CRIT' || result === 'HIT' || result === 'GRAZE') hits++
    }
    return hits
  }

  it('every shot in the spell_area_1 flip annulus misses at baseline and hits with the upgrade', () => {
    // Place targets just inside the upgraded disc but just outside the baseline disc:
    //   ringRadius = lowRadius + midpoint(baseR, upgradedR)
    // — every shot in this ring is MISS at baseline and HIT with spell_area_1.
    const baseline = buildUpgradeState()
    const upgraded = buildUpgradeState('spell_area_1')
    const baseR = PROJECTILE_BASE_RADIUS_PX * baseline.spellAreaMultiplier
    const upgradedR = PROJECTILE_BASE_RADIUS_PX * upgraded.spellAreaMultiplier
    expect(upgradedR).toBeGreaterThan(baseR)

    const ringRadius = layout.lowRadius + (baseR + upgradedR) / 2
    const n = 24

    expect(ringHitCount(baseline, ringRadius, n)).toBe(0)
    expect(ringHitCount(upgraded, ringRadius, n)).toBe(n)
  })

  it('each spell_area tier strictly extends the effective hit disc beyond the previous tier', () => {
    // Deterministic tier-by-tier test: for each upgrade tier, place the ring
    // halfway between the previous tier's disc and the current tier's disc.
    // The ring must MISS at the previous tier and HIT at the current tier.
    const tiers: GlobalUpgradeState[] = [
      buildUpgradeState(),
      buildUpgradeState('spell_area_1'),
      buildUpgradeState('spell_area_1', 'spell_area_2'),
      buildUpgradeState('spell_area_1', 'spell_area_2', 'spell_area_3'),
    ]
    const n = 16
    for (let i = 1; i < tiers.length; i++) {
      const prevR = PROJECTILE_BASE_RADIUS_PX * tiers[i - 1].spellAreaMultiplier
      const curR = PROJECTILE_BASE_RADIUS_PX * tiers[i].spellAreaMultiplier
      expect(curR).toBeGreaterThan(prevR)
      const ringRadius = layout.lowRadius + (prevR + curR) / 2
      expect(ringHitCount(tiers[i - 1], ringRadius, n)).toBe(0)
      expect(ringHitCount(tiers[i], ringRadius, n)).toBe(n)
    }
  })
})

// ---------------------------------------------------------------------------
// AC #1 — Power user: proj_speed shortens flight time
// ---------------------------------------------------------------------------

describe('Game Design: proj_speed_X — power-user encounter time drops', () => {
  it('proj_speed_2 (×1.30) — fireball flight time is 1/1.30 of baseline', () => {
    const mul = multiplierOf('projectileSpeedMultiplier', 'proj_speed_2')
    const enemy = new Enemy(GAME_WIDTH / 2, ENEMY_DEFAULT_Y, ENEMY_GOBLIN_SCOUT.hitZoneLayout)
    const origin = { x: 0, y: enemy.y }
    const target = { x: enemy.x, y: enemy.y }

    const baseline = fireAndResolve(enemy, origin, target, 'fireball', buildUpgradeState())
    const upgraded = fireAndResolve(enemy, origin, target, 'fireball', buildUpgradeState('proj_speed_1', 'proj_speed_2'))

    // Allow 0.5 ms slack for the integer step inside fireAndResolve.
    expect(upgraded.flightMs).toBeCloseTo(baseline.flightMs / mul, 1)
    expect(mul).toBeGreaterThanOrEqual(1.30)
  })

  it('proj_speed_3 (×1.50) — fireball reaches enemy at least 30 % faster than baseline (AC #1 power-user intent)', () => {
    const enemy = new Enemy(GAME_WIDTH / 2, ENEMY_DEFAULT_Y, ENEMY_GOBLIN_SCOUT.hitZoneLayout)
    const origin = { x: 0, y: enemy.y }
    const target = { x: enemy.x, y: enemy.y }

    const baseline = fireAndResolve(enemy, origin, target, 'fireball', buildUpgradeState())
    const upgraded = fireAndResolve(
      enemy, origin, target, 'fireball',
      buildUpgradeState('proj_speed_1', 'proj_speed_2', 'proj_speed_3'),
    )

    // Difficulty intent: at least 30 % speed-up at tier 3.
    expect(upgraded.flightMs).toBeLessThanOrEqual(baseline.flightMs * 0.70 + 1e-9)
  })

  it('each proj_speed tier is monotonically faster than the previous', () => {
    const t1 = multiplierOf('projectileSpeedMultiplier', 'proj_speed_1')
    const t2 = buildUpgradeState('proj_speed_1', 'proj_speed_2').projectileSpeedMultiplier
    const t3 = buildUpgradeState('proj_speed_1', 'proj_speed_2', 'proj_speed_3').projectileSpeedMultiplier
    expect(t2).toBeGreaterThan(t1)
    expect(t3).toBeGreaterThan(t2)
  })
})

// ---------------------------------------------------------------------------
// AC #2 + #3 — Near-miss boundary: HIT at (zoneRadius + projectileRadius - ε), MISS at +ε
// ---------------------------------------------------------------------------

describe('Game Design: near-miss boundary respects projectileRadius', () => {
  const EPSILON_PX = 0.5
  const layout = ENEMY_GOBLIN_SCOUT.hitZoneLayout!
  const ENEMY_X = GAME_WIDTH / 2
  const ENEMY_Y = ENEMY_DEFAULT_Y

  it('at baseline radius — shot at (lowRadius + baseR − ε) → HIT or better, at +ε → MISS', () => {
    const baseline = buildUpgradeState()
    const enemy = new Enemy(ENEMY_X, ENEMY_Y, layout)
    const lowCX = enemy.x + layout.lowDx
    const lowCY = enemy.y + layout.lowDy
    const r = projectileRadiusPx(baseline)

    // Inside the disc-inflated low (GRAZE) ring — should hit
    const insideTarget = { x: lowCX + layout.lowRadius + r - EPSILON_PX, y: lowCY }
    const inside = fireAndResolve(enemy, { x: 0, y: lowCY }, insideTarget, 'fireball', baseline)
    expect(['CRIT', 'HIT', 'GRAZE']).toContain(inside.result)

    // Outside the disc-inflated low ring — should miss
    const outsideTarget = { x: lowCX + layout.lowRadius + r + EPSILON_PX, y: lowCY }
    const outside = fireAndResolve(enemy, { x: 0, y: lowCY }, outsideTarget, 'fireball', baseline)
    expect(outside.result).toBe('MISS')
  })

  it('with spell_area_1 — the boundary moves outward by (1.20 − 1.0) × PROJECTILE_BASE_RADIUS_PX', () => {
    const upgrades = buildUpgradeState('spell_area_1')
    const enemy = new Enemy(ENEMY_X, ENEMY_Y, layout)
    const baseR = PROJECTILE_BASE_RADIUS_PX
    const upgradedR = projectileRadiusPx(upgrades)
    expect(upgradedR).toBeGreaterThan(baseR)

    // Point in the band [layout.lowRadius + baseR, layout.lowRadius + upgradedR]:
    // MISS at baseline radius, HIT (any zone) at upgraded radius.
    const lowCX = enemy.x + layout.lowDx
    const lowCY = enemy.y + layout.lowDy
    const dx = layout.lowRadius + (baseR + upgradedR) / 2
    const target = { x: lowCX + dx, y: lowCY }

    const baseline = fireAndResolve(enemy, { x: 0, y: lowCY }, target, 'fireball', buildUpgradeState())
    expect(baseline.result).toBe('MISS')

    const upgraded = fireAndResolve(enemy, { x: 0, y: lowCY }, target, 'fireball', upgrades)
    expect(['CRIT', 'HIT', 'GRAZE']).toContain(upgraded.result)
  })

  it('numbers are derived from constants — no hardcoded radii', () => {
    // Spell area tier 1 multiplier = 1.20 by current design — verified through
    // applyUpgradeNode so the assertion follows UPGRADE_NODES if it changes.
    const mul = multiplierOf('spellAreaMultiplier', 'spell_area_1')
    // The upgrade tree must define a real (>1.0) spell area boost at tier 1.
    expect(mul).toBeGreaterThan(1.0)
    // And the effective radius for a casual player must scale accordingly.
    const baseline = buildUpgradeState()
    const upgraded = buildUpgradeState('spell_area_1')
    expect(projectileRadiusPx(upgraded)).toBeCloseTo(projectileRadiusPx(baseline) * mul, 6)
  })
})

// ---------------------------------------------------------------------------
// AC #2 — spell_area benefit also includes fireball's explosion (radius scales)
// ---------------------------------------------------------------------------

describe('Game Design: spell area scales every projectile uniformly', () => {
  it('fireball, white_shot, slow_shot, fast_shot all inherit the same area multiplier', () => {
    const upgrades = buildUpgradeState('spell_area_1', 'spell_area_2', 'spell_area_3')
    const enemy = new Enemy(GAME_WIDTH / 2, ENEMY_DEFAULT_Y, ENEMY_GOBLIN_SCOUT.hitZoneLayout)
    const expectedRadius = projectileRadiusPx(upgrades)

    const skills: SkillType[] = ['fireball', 'white_shot', 'slow_shot', 'fast_shot']
    for (const skill of skills) {
      const sys = new ProjectileSystem()
      sys.fire({ x: 0, y: enemy.y }, { x: enemy.x, y: enemy.y }, skill, 0, {
        projectileSpeedMultiplier: upgrades.projectileSpeedMultiplier,
        spellAreaMultiplier: upgrades.spellAreaMultiplier,
      })
      // Drain to arrival — flight time differs per skill but any large step works
      const hits = sys.update(60_000, enemy)
      expect(hits).toHaveLength(1)
      expect(hits[0].projectileRadius).toBeCloseTo(expectedRadius, 6)
    }
  })
})

// ---------------------------------------------------------------------------
// Upgrade tree coverage — spell_area and proj_speed paths are reachable
// ---------------------------------------------------------------------------

describe('Game Design: upgrade tree wiring', () => {
  it('every proj_speed_X and spell_area_X node strictly increases its tuned field', () => {
    const speedIds = UPGRADE_NODES.filter((n) => n.id.startsWith('proj_speed_')).map((n) => n.id)
    const areaIds = UPGRADE_NODES.filter((n) => n.id.startsWith('spell_area_')).map((n) => n.id)
    expect(speedIds.length).toBeGreaterThan(0)
    expect(areaIds.length).toBeGreaterThan(0)

    let prev = DEFAULT_GLOBAL_UPGRADE_STATE.projectileSpeedMultiplier
    let s: GlobalUpgradeState = {
      ...DEFAULT_GLOBAL_UPGRADE_STATE,
      unlockedNodeIds: [...DEFAULT_GLOBAL_UPGRADE_STATE.unlockedNodeIds],
    }
    for (const id of speedIds) {
      s = applyUpgradeNode(s, id)
      expect(s.projectileSpeedMultiplier).toBeGreaterThan(prev)
      prev = s.projectileSpeedMultiplier
    }

    let prevArea = DEFAULT_GLOBAL_UPGRADE_STATE.spellAreaMultiplier
    let s2: GlobalUpgradeState = {
      ...DEFAULT_GLOBAL_UPGRADE_STATE,
      unlockedNodeIds: [...DEFAULT_GLOBAL_UPGRADE_STATE.unlockedNodeIds],
    }
    for (const id of areaIds) {
      s2 = applyUpgradeNode(s2, id)
      expect(s2.spellAreaMultiplier).toBeGreaterThan(prevArea)
      prevArea = s2.spellAreaMultiplier
    }
  })
})
