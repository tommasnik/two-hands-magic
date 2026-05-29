import { describe, it, expect } from 'vitest'
import { calculateDamage } from '../../game/systems/DamageSystem'
import {
  SLOW_SKILL_DAMAGE,
  FAST_SKILL_DAMAGE,
  WHITE_SHOT_SKILL_DAMAGE_MIN,
  WHITE_SHOT_SKILL_DAMAGE_MAX,
  FIREBALL_SKILL_DAMAGE_MIN,
  FIREBALL_SKILL_DAMAGE_MAX,
  CRIT_DAMAGE_MULTIPLIER,
  GRAZE_DAMAGE_MULTIPLIER,
  NEW_SKILL_GREEN_ZONE_MULTIPLIER,
  DEFAULT_GLOBAL_UPGRADE_STATE,
  UPGRADE_NODES,
} from '../../game/constants'
import { applyUpgradeNode } from '../../game/upgrades'
import type { GlobalUpgradeState, UpgradeNodeId } from '../../types'

/** Apply a chain of upgrade nodes to a fresh DEFAULT_GLOBAL_UPGRADE_STATE. */
function upgradeWith(...ids: UpgradeNodeId[]): GlobalUpgradeState {
  let s: GlobalUpgradeState = {
    ...DEFAULT_GLOBAL_UPGRADE_STATE,
    unlockedNodeIds: [...DEFAULT_GLOBAL_UPGRADE_STATE.unlockedNodeIds],
  }
  for (const id of ids) s = applyUpgradeNode(s, id)
  return s
}

/** Look up a node's `applyTo` definition for reading the magnitudes the test asserts on. */
function nodeMultiplier(id: UpgradeNodeId, field: keyof GlobalUpgradeState): number {
  const after = upgradeWith(id)
  return after[field] as number
}

// RNG helpers for deterministic boundary tests
const rngMin = () => 0        // always rolls minimum
const rngMax = () => 0.9999   // always rolls maximum

// ============================================================
// calculateDamage — slow_shot (fixed damage)
// ============================================================

describe('calculateDamage — slow_shot', () => {
  it('CRIT × slow_shot returns SLOW_SKILL_DAMAGE × CRIT_DAMAGE_MULTIPLIER', () => {
    expect(calculateDamage('CRIT', 'slow_shot')).toBe(SLOW_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER)
  })

  it('HIT × slow_shot returns SLOW_SKILL_DAMAGE × 1.0', () => {
    expect(calculateDamage('HIT', 'slow_shot')).toBe(SLOW_SKILL_DAMAGE)
  })

  it('GRAZE × slow_shot returns SLOW_SKILL_DAMAGE × GRAZE_DAMAGE_MULTIPLIER', () => {
    expect(calculateDamage('GRAZE', 'slow_shot')).toBe(SLOW_SKILL_DAMAGE * GRAZE_DAMAGE_MULTIPLIER)
  })

  it('MISS × slow_shot returns 0', () => {
    expect(calculateDamage('MISS', 'slow_shot')).toBe(0)
  })
})

// ============================================================
// calculateDamage — fast_shot (fixed damage)
// ============================================================

describe('calculateDamage — fast_shot', () => {
  it('CRIT × fast_shot returns FAST_SKILL_DAMAGE × CRIT_DAMAGE_MULTIPLIER', () => {
    expect(calculateDamage('CRIT', 'fast_shot')).toBe(FAST_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER)
  })

  it('HIT × fast_shot returns FAST_SKILL_DAMAGE × 1.0', () => {
    expect(calculateDamage('HIT', 'fast_shot')).toBe(FAST_SKILL_DAMAGE)
  })

  it('GRAZE × fast_shot returns FAST_SKILL_DAMAGE × GRAZE_DAMAGE_MULTIPLIER', () => {
    expect(calculateDamage('GRAZE', 'fast_shot')).toBe(FAST_SKILL_DAMAGE * GRAZE_DAMAGE_MULTIPLIER)
  })

  it('MISS × fast_shot returns 0', () => {
    expect(calculateDamage('MISS', 'fast_shot')).toBe(0)
  })
})

// ============================================================
// calculateDamage — fireball (random spread 10–14)
// ============================================================

describe('calculateDamage — fireball spread', () => {
  it('HIT × fireball at rng=min returns FIREBALL_SKILL_DAMAGE_MIN', () => {
    expect(calculateDamage('HIT', 'fireball', rngMin)).toBe(FIREBALL_SKILL_DAMAGE_MIN)
  })

  it('HIT × fireball at rng=max returns FIREBALL_SKILL_DAMAGE_MAX', () => {
    expect(calculateDamage('HIT', 'fireball', rngMax)).toBe(FIREBALL_SKILL_DAMAGE_MAX)
  })

  it('HIT × fireball output is always within [MIN, MAX] over 200 rolls', () => {
    for (let i = 0; i < 200; i++) {
      const dmg = calculateDamage('HIT', 'fireball')
      expect(dmg).toBeGreaterThanOrEqual(FIREBALL_SKILL_DAMAGE_MIN)
      expect(dmg).toBeLessThanOrEqual(FIREBALL_SKILL_DAMAGE_MAX)
    }
  })

  it('CRIT × fireball at rng=min returns FIREBALL_SKILL_DAMAGE_MIN × CRIT_DAMAGE_MULTIPLIER', () => {
    expect(calculateDamage('CRIT', 'fireball', rngMin)).toBe(FIREBALL_SKILL_DAMAGE_MIN * CRIT_DAMAGE_MULTIPLIER)
  })

  it('CRIT × fireball at rng=max returns FIREBALL_SKILL_DAMAGE_MAX × CRIT_DAMAGE_MULTIPLIER', () => {
    expect(calculateDamage('CRIT', 'fireball', rngMax)).toBe(FIREBALL_SKILL_DAMAGE_MAX * CRIT_DAMAGE_MULTIPLIER)
  })

  it('GRAZE × fireball at rng=min returns FIREBALL_SKILL_DAMAGE_MIN × NEW_SKILL_GREEN_ZONE_MULTIPLIER', () => {
    expect(calculateDamage('GRAZE', 'fireball', rngMin)).toBe(
      FIREBALL_SKILL_DAMAGE_MIN * NEW_SKILL_GREEN_ZONE_MULTIPLIER,
    )
  })

  it('GRAZE × fireball at rng=max returns FIREBALL_SKILL_DAMAGE_MAX × NEW_SKILL_GREEN_ZONE_MULTIPLIER', () => {
    expect(calculateDamage('GRAZE', 'fireball', rngMax)).toBe(
      FIREBALL_SKILL_DAMAGE_MAX * NEW_SKILL_GREEN_ZONE_MULTIPLIER,
    )
  })

  it('MISS × fireball returns 0 regardless of rng', () => {
    expect(calculateDamage('MISS', 'fireball', rngMin)).toBe(0)
    expect(calculateDamage('MISS', 'fireball', rngMax)).toBe(0)
  })

  it('all 5 distinct base damage values (10–14) are reachable', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 10_000; i++) {
      seen.add(calculateDamage('HIT', 'fireball'))
      if (seen.size === FIREBALL_SKILL_DAMAGE_MAX - FIREBALL_SKILL_DAMAGE_MIN + 1) break
    }
    expect(seen.size).toBe(FIREBALL_SKILL_DAMAGE_MAX - FIREBALL_SKILL_DAMAGE_MIN + 1)
  })
})

// ============================================================
// calculateDamage — white_shot (random spread 2–4)
// ============================================================

describe('calculateDamage — white_shot spread', () => {
  it('HIT × white_shot at rng=min returns WHITE_SHOT_SKILL_DAMAGE_MIN', () => {
    expect(calculateDamage('HIT', 'white_shot', rngMin)).toBe(WHITE_SHOT_SKILL_DAMAGE_MIN)
  })

  it('HIT × white_shot at rng=max returns WHITE_SHOT_SKILL_DAMAGE_MAX', () => {
    expect(calculateDamage('HIT', 'white_shot', rngMax)).toBe(WHITE_SHOT_SKILL_DAMAGE_MAX)
  })

  it('HIT × white_shot output is always within [MIN, MAX] over 200 rolls', () => {
    for (let i = 0; i < 200; i++) {
      const dmg = calculateDamage('HIT', 'white_shot')
      expect(dmg).toBeGreaterThanOrEqual(WHITE_SHOT_SKILL_DAMAGE_MIN)
      expect(dmg).toBeLessThanOrEqual(WHITE_SHOT_SKILL_DAMAGE_MAX)
    }
  })

  it('CRIT × white_shot at rng=min returns WHITE_SHOT_SKILL_DAMAGE_MIN × CRIT_DAMAGE_MULTIPLIER', () => {
    expect(calculateDamage('CRIT', 'white_shot', rngMin)).toBe(
      WHITE_SHOT_SKILL_DAMAGE_MIN * CRIT_DAMAGE_MULTIPLIER,
    )
  })

  it('CRIT × white_shot at rng=max returns WHITE_SHOT_SKILL_DAMAGE_MAX × CRIT_DAMAGE_MULTIPLIER', () => {
    expect(calculateDamage('CRIT', 'white_shot', rngMax)).toBe(
      WHITE_SHOT_SKILL_DAMAGE_MAX * CRIT_DAMAGE_MULTIPLIER,
    )
  })

  it('GRAZE × white_shot at rng=min returns WHITE_SHOT_SKILL_DAMAGE_MIN × NEW_SKILL_GREEN_ZONE_MULTIPLIER', () => {
    expect(calculateDamage('GRAZE', 'white_shot', rngMin)).toBe(
      WHITE_SHOT_SKILL_DAMAGE_MIN * NEW_SKILL_GREEN_ZONE_MULTIPLIER,
    )
  })

  it('GRAZE × white_shot at rng=max returns WHITE_SHOT_SKILL_DAMAGE_MAX × NEW_SKILL_GREEN_ZONE_MULTIPLIER', () => {
    expect(calculateDamage('GRAZE', 'white_shot', rngMax)).toBe(
      WHITE_SHOT_SKILL_DAMAGE_MAX * NEW_SKILL_GREEN_ZONE_MULTIPLIER,
    )
  })

  it('MISS × white_shot returns 0 regardless of rng', () => {
    expect(calculateDamage('MISS', 'white_shot', rngMin)).toBe(0)
    expect(calculateDamage('MISS', 'white_shot', rngMax)).toBe(0)
  })

  it('all 3 distinct base damage values (2–4) are reachable', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 10_000; i++) {
      seen.add(calculateDamage('HIT', 'white_shot'))
      if (seen.size === WHITE_SHOT_SKILL_DAMAGE_MAX - WHITE_SHOT_SKILL_DAMAGE_MIN + 1) break
    }
    expect(seen.size).toBe(WHITE_SHOT_SKILL_DAMAGE_MAX - WHITE_SHOT_SKILL_DAMAGE_MIN + 1)
  })
})

// ============================================================
// MISS always returns 0 — cross-skill boundary
// ============================================================

describe('calculateDamage — boundary: MISS always returns 0', () => {
  it('MISS × slow_shot is 0', () => {
    expect(calculateDamage('MISS', 'slow_shot')).toBe(0)
  })

  it('MISS × fast_shot is 0', () => {
    expect(calculateDamage('MISS', 'fast_shot')).toBe(0)
  })

  it('MISS × fireball is 0', () => {
    expect(calculateDamage('MISS', 'fireball')).toBe(0)
  })

  it('MISS × white_shot is 0', () => {
    expect(calculateDamage('MISS', 'white_shot')).toBe(0)
  })
})

// ============================================================
// Concrete expected values — fixed-damage skills
// ============================================================

describe('calculateDamage — concrete expected values (fixed skills)', () => {
  it('CRIT × slow_shot = 40 (20 × 2.0)', () => {
    expect(calculateDamage('CRIT', 'slow_shot')).toBe(40)
  })

  it('GRAZE × fast_shot = 6 (10 × 0.6)', () => {
    expect(calculateDamage('GRAZE', 'fast_shot')).toBeCloseTo(6)
  })

  it('GRAZE × slow_shot = 12 (20 × 0.6)', () => {
    expect(calculateDamage('GRAZE', 'slow_shot')).toBeCloseTo(12)
  })

  it('HIT × fast_shot = 10', () => {
    expect(calculateDamage('HIT', 'fast_shot')).toBe(10)
  })

  it('green zone GRAZE damage is 60% of HIT damage for slow_shot', () => {
    const graze = calculateDamage('GRAZE', 'slow_shot')
    const hit = calculateDamage('HIT', 'slow_shot')
    expect(graze).toBeCloseTo(hit * 0.6, 10)
  })
})

// ============================================================
// calculateDamage — upgrade-aware crit damage multiplier
// ============================================================

describe('calculateDamage — upgrades.critDamageMultiplier', () => {
  it('default upgrades preserve baseline CRIT damage (regression for unmodified runs)', () => {
    const dmg = calculateDamage('CRIT', 'slow_shot', Math.random, {
      upgrades: { ...DEFAULT_GLOBAL_UPGRADE_STATE, unlockedNodeIds: [...DEFAULT_GLOBAL_UPGRADE_STATE.unlockedNodeIds] },
    })
    expect(dmg).toBe(SLOW_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER)
  })

  it('crit_dmg_1 applies its multiplier instead of the base CRIT multiplier', () => {
    const m = nodeMultiplier('crit_dmg_1', 'critDamageMultiplier')
    const dmg = calculateDamage('CRIT', 'slow_shot', Math.random, { upgrades: upgradeWith('crit_dmg_1') })
    expect(dmg).toBe(Math.round(SLOW_SKILL_DAMAGE * m))
  })

  it('crit_dmg_2 yields Math.round(SLOW_SKILL_DAMAGE × 2.7) damage on a slow_shot CRIT (AC #1)', () => {
    const m = nodeMultiplier('crit_dmg_2', 'critDamageMultiplier')
    const dmg = calculateDamage('CRIT', 'slow_shot', Math.random, { upgrades: upgradeWith('crit_dmg_1', 'crit_dmg_2') })
    expect(dmg).toBe(Math.round(SLOW_SKILL_DAMAGE * m))
  })

  it('crit_dmg_3 multiplier exceeds crit_dmg_2 (monotonic progression)', () => {
    const m2 = nodeMultiplier('crit_dmg_2', 'critDamageMultiplier')
    const m3 = upgradeWith('crit_dmg_1', 'crit_dmg_2', 'crit_dmg_3').critDamageMultiplier
    expect(m3).toBeGreaterThan(m2)
  })

  it('upgrades.critDamageMultiplier does not affect HIT damage', () => {
    const dmg = calculateDamage('HIT', 'slow_shot', Math.random, { upgrades: upgradeWith('crit_dmg_1', 'crit_dmg_2', 'crit_dmg_3') })
    expect(dmg).toBe(SLOW_SKILL_DAMAGE)
  })

  it('upgrades.critDamageMultiplier does not affect GRAZE damage', () => {
    const dmg = calculateDamage('GRAZE', 'slow_shot', Math.random, { upgrades: upgradeWith('crit_dmg_1', 'crit_dmg_2', 'crit_dmg_3') })
    expect(dmg).toBe(SLOW_SKILL_DAMAGE * GRAZE_DAMAGE_MULTIPLIER)
  })

  it('upgrades.critDamageMultiplier scales fireball CRIT damage', () => {
    const m = nodeMultiplier('crit_dmg_1', 'critDamageMultiplier')
    const rngMin = () => 0
    const dmg = calculateDamage('CRIT', 'fireball', rngMin, { upgrades: upgradeWith('crit_dmg_1') })
    expect(dmg).toBe(Math.round(FIREBALL_SKILL_DAMAGE_MIN * m))
  })
})

// ============================================================
// calculateDamage — quick chain bonus
// ============================================================

describe('calculateDamage — quick chain bonus (precomputed at fire time)', () => {
  it('chainBonus = 0 leaves damage unchanged', () => {
    const dmg = calculateDamage('HIT', 'slow_shot', Math.random, {
      upgrades: DEFAULT_GLOBAL_UPGRADE_STATE,
      chainBonus: 0,
    })
    expect(dmg).toBe(SLOW_SKILL_DAMAGE)
  })

  it('chainBonus > 0 multiplies HIT damage by (1 + chainBonus) (AC #3)', () => {
    const upgrades = upgradeWith('cast_time_1', 'quick_chain_1')
    const bonus = upgrades.quickChainBonus
    const dmg = calculateDamage('HIT', 'slow_shot', Math.random, { upgrades, chainBonus: bonus })
    expect(dmg).toBe(Math.round(SLOW_SKILL_DAMAGE * (1 + bonus)))
  })

  it('chainBonus stacks multiplicatively with crit_dmg_1 on CRIT', () => {
    const upgrades = upgradeWith('cast_time_1', 'quick_chain_1', 'crit_dmg_1')
    const bonus = upgrades.quickChainBonus
    const m = upgrades.critDamageMultiplier
    const dmg = calculateDamage('CRIT', 'slow_shot', Math.random, { upgrades, chainBonus: bonus })
    expect(dmg).toBe(Math.round(SLOW_SKILL_DAMAGE * m * (1 + bonus)))
  })

  it('quick_chain_2 bonus is larger than quick_chain_1', () => {
    const b1 = upgradeWith('cast_time_1', 'quick_chain_1').quickChainBonus
    const b2 = upgradeWith('cast_time_1', 'quick_chain_1', 'quick_chain_2').quickChainBonus
    const dmg1 = calculateDamage('HIT', 'slow_shot', Math.random, { chainBonus: b1 })
    const dmg2 = calculateDamage('HIT', 'slow_shot', Math.random, { chainBonus: b2 })
    expect(dmg2).toBeGreaterThan(dmg1)
  })

  it('chainBonus ≤ 0 leaves damage untouched even when upgrades is provided', () => {
    const upgrades = upgradeWith('cast_time_1', 'quick_chain_1')
    const dmg = calculateDamage('HIT', 'slow_shot', Math.random, { upgrades, chainBonus: 0 })
    expect(dmg).toBe(SLOW_SKILL_DAMAGE)
  })

  it('MISS still returns 0 even when chainBonus would otherwise apply', () => {
    const dmg = calculateDamage('MISS', 'slow_shot', Math.random, { chainBonus: 0.20 })
    expect(dmg).toBe(0)
  })
})

// ============================================================
// Upgrade tree sanity — exercise the constant lookups so the tests fail fast
// if an upgrade id disappears.
// ============================================================

describe('calculateDamage — upgrade tree coverage', () => {
  it('every UPGRADE_NODES id is reachable via applyUpgradeNode in dependency order', () => {
    // Iterate UPGRADE_NODES and ensure each id can be unlocked starting from the default state.
    let s: GlobalUpgradeState = {
      ...DEFAULT_GLOBAL_UPGRADE_STATE,
      unlockedNodeIds: [...DEFAULT_GLOBAL_UPGRADE_STATE.unlockedNodeIds],
    }
    for (const node of UPGRADE_NODES) {
      if (s.unlockedNodeIds.includes(node.id)) continue
      // Apply if requires are met (OR semantics)
      const reqOk = node.requires.length === 0 || node.requires.some((d) => s.unlockedNodeIds.includes(d))
      if (reqOk) s = applyUpgradeNode(s, node.id)
    }
    // All non-root nodes should now be reachable through this single pass for the chosen path.
    // We at least expect cast_time_1 and crit_dmg_1 to be unlocked because they are root nodes.
    expect(s.unlockedNodeIds).toContain('cast_time_1')
    expect(s.unlockedNodeIds).toContain('crit_dmg_1')
  })
})
