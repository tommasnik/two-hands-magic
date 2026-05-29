// ============================================================
// Game Design: Projectile speed and spell area upgrades (TASK-44)
//
// Exercises projectileSpeedMultiplier and spellAreaMultiplier through the
// ProjectileSystem pipeline. All numeric assertions derive from
// constants.ts and UPGRADE_NODES — so a designer can retune any of these
// without re-authoring the spec.
//
// Difficulty intent (what the upgrades are FOR):
//   - spell_area_X: casual hit rate up, near-miss CRIT band up
//   - proj_speed_X: power-user encounter time down
//
// NOTE (task-54): Enemy now uses mask-only hit detection. Geometric hit zone
// tests that depended on hitZoneLayout/legacy body geometry have been removed.
// Spell area radius baking and projectile speed scaling are still tested here
// as they are ProjectileSystem concerns, not Enemy concerns.
// ============================================================

import { describe, it, expect } from 'vitest'
import { ProjectileSystem } from '../../game/systems/ProjectileSystem'
import { Enemy } from '../../game/entities/Enemy'
import type { SkillType } from '../../types'
import {
  PROJECTILE_BASE_RADIUS_CM,
  PROJECTILE_BASE_RADIUS_PX,
  PIXELS_PER_CM,
  FIREBALL_SPEED_CM,
  PROJECTILE_SPEED_CM,
  UPGRADE_NODES,
  DEFAULT_GLOBAL_UPGRADE_STATE,
  ENEMY_DEFAULT_Y,
  GAME_WIDTH,
} from '../../game/constants'
import { applyUpgradeNode } from '../../game/upgrades'
import type { UpgradeNodeId, GlobalUpgradeState } from '../../types'

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

/** Fire a single projectile through the system and return its hit result and flight time. */
function fireAndResolve(
  enemy: Enemy,
  origin: { x: number; y: number },
  target: { x: number; y: number },
  skillType: SkillType,
  upgrades: GlobalUpgradeState,
): { flightMs: number; projectileRadius: number } {
  const sys = new ProjectileSystem()
  sys.fire(origin, target, skillType, 0, {
    projectileSpeedMultiplier: upgrades.projectileSpeedMultiplier,
    spellAreaMultiplier: upgrades.spellAreaMultiplier,
  })
  const dx = target.x - origin.x
  const dy = target.y - origin.y
  const distPx = Math.sqrt(dx * dx + dy * dy)
  const baseSpeed = skillType === 'fireball' || skillType === 'slow_shot'
    ? FIREBALL_SPEED_CM
    : PROJECTILE_SPEED_CM
  const effectiveSpeedCmPerS = baseSpeed * upgrades.projectileSpeedMultiplier
  const flightMs = (distPx / (effectiveSpeedCmPerS * PIXELS_PER_CM)) * 1000
  const hits = sys.update(flightMs + 1, enemy)
  expect(hits).toHaveLength(1)
  return { flightMs, projectileRadius: hits[0].projectileRadius }
}

// ---------------------------------------------------------------------------
// AC #3 — Regression: behaviour without upgrades is identical to today's tests
// ---------------------------------------------------------------------------

describe('Game Design: spell area / projectile speed — regression without upgrades', () => {
  it('PROJECTILE_BASE_RADIUS_CM stays small enough not to break existing point-vs-zone tests', () => {
    expect(PROJECTILE_BASE_RADIUS_CM).toBeLessThanOrEqual(0.05)
  })

  it('default global upgrades leave projectileSpeedMultiplier and spellAreaMultiplier at 1.0', () => {
    expect(DEFAULT_GLOBAL_UPGRADE_STATE.projectileSpeedMultiplier).toBe(1.0)
    expect(DEFAULT_GLOBAL_UPGRADE_STATE.spellAreaMultiplier).toBe(1.0)
  })
})

// ---------------------------------------------------------------------------
// AC #2 — Spell area radius scales with each upgrade tier
// ---------------------------------------------------------------------------

describe('Game Design: spell_area tiers scale projectile radius', () => {
  it('each spell_area tier strictly extends the effective projectile radius', () => {
    const tiers: GlobalUpgradeState[] = [
      buildUpgradeState(),
      buildUpgradeState('spell_area_1'),
      buildUpgradeState('spell_area_1', 'spell_area_2'),
      buildUpgradeState('spell_area_1', 'spell_area_2', 'spell_area_3'),
    ]
    for (let i = 1; i < tiers.length; i++) {
      const prevR = projectileRadiusPx(tiers[i - 1])
      const curR = projectileRadiusPx(tiers[i])
      expect(curR).toBeGreaterThan(prevR)
    }
  })

  it('spell_area_1 multiplier is > 1.0', () => {
    const mul = multiplierOf('spellAreaMultiplier', 'spell_area_1')
    expect(mul).toBeGreaterThan(1.0)
    const baseline = buildUpgradeState()
    const upgraded = buildUpgradeState('spell_area_1')
    expect(projectileRadiusPx(upgraded)).toBeCloseTo(projectileRadiusPx(baseline) * mul, 6)
  })
})

// ---------------------------------------------------------------------------
// AC #1 — Power user: proj_speed shortens flight time
// ---------------------------------------------------------------------------

describe('Game Design: proj_speed_X — power-user encounter time drops', () => {
  it('proj_speed_2 (x1.30) — fireball flight time is 1/1.30 of baseline', () => {
    const mul = multiplierOf('projectileSpeedMultiplier', 'proj_speed_2')
    const enemy = new Enemy(GAME_WIDTH / 2, ENEMY_DEFAULT_Y)
    const origin = { x: 0, y: enemy.y }
    const target = { x: enemy.x, y: enemy.y }

    const baseline = fireAndResolve(enemy, origin, target, 'fireball', buildUpgradeState())
    const upgraded = fireAndResolve(enemy, origin, target, 'fireball', buildUpgradeState('proj_speed_1', 'proj_speed_2'))

    expect(upgraded.flightMs).toBeCloseTo(baseline.flightMs / mul, 1)
    expect(mul).toBeGreaterThanOrEqual(1.30)
  })

  it('proj_speed_3 (x1.50) — fireball reaches enemy at least 30 % faster than baseline', () => {
    const enemy = new Enemy(GAME_WIDTH / 2, ENEMY_DEFAULT_Y)
    const origin = { x: 0, y: enemy.y }
    const target = { x: enemy.x, y: enemy.y }

    const baseline = fireAndResolve(enemy, origin, target, 'fireball', buildUpgradeState())
    const upgraded = fireAndResolve(
      enemy, origin, target, 'fireball',
      buildUpgradeState('proj_speed_1', 'proj_speed_2', 'proj_speed_3'),
    )

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
// AC #2 — spell_area benefit also includes fireball's explosion (radius scales)
// ---------------------------------------------------------------------------

describe('Game Design: spell area scales every projectile uniformly', () => {
  it('fireball, white_shot, slow_shot, fast_shot all inherit the same area multiplier', () => {
    const upgrades = buildUpgradeState('spell_area_1', 'spell_area_2', 'spell_area_3')
    const enemy = new Enemy(GAME_WIDTH / 2, ENEMY_DEFAULT_Y)
    const expectedRadius = projectileRadiusPx(upgrades)

    const skills: SkillType[] = ['fireball', 'white_shot', 'slow_shot', 'fast_shot']
    for (const skill of skills) {
      const sys = new ProjectileSystem()
      sys.fire({ x: 0, y: enemy.y }, { x: enemy.x, y: enemy.y }, skill, 0, {
        projectileSpeedMultiplier: upgrades.projectileSpeedMultiplier,
        spellAreaMultiplier: upgrades.spellAreaMultiplier,
      })
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
