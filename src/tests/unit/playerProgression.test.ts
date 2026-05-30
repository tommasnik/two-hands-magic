// ============================================================
// PlayerProgression — unit tests for computePlayerStats
// ============================================================

import { describe, it, expect } from 'vitest'
import { computePlayerStats } from '../../game/systems/PlayerProgression'
import type { PlayerStats } from '../../game/systems/PlayerProgression'
import {
  DEFAULT_GLOBAL_UPGRADE_STATE,
  CRIT_DAMAGE_MULTIPLIER,
  PLAYER_MAX_HP,
  UPGRADE_NODES,
} from '../../game/constants'
import { applyUpgradeNode } from '../../game/upgrades'
import type { GlobalUpgradeState, UpgradeNodeId } from '../../types'

/** Build a GlobalUpgradeState by unlocking nodes in order. */
function buildState(...ids: UpgradeNodeId[]): GlobalUpgradeState {
  let s: GlobalUpgradeState = {
    ...DEFAULT_GLOBAL_UPGRADE_STATE,
    unlockedNodeIds: [...DEFAULT_GLOBAL_UPGRADE_STATE.unlockedNodeIds],
  }
  for (const id of ids) s = applyUpgradeNode(s, id)
  return s
}

// ============================================================
// Default state
// ============================================================

describe('computePlayerStats — default state', () => {
  it('critDamageMultiplier matches CRIT_DAMAGE_MULTIPLIER', () => {
    const stats = computePlayerStats(DEFAULT_GLOBAL_UPGRADE_STATE)
    expect(stats.critDamageMultiplier).toBe(CRIT_DAMAGE_MULTIPLIER)
  })

  it('castTimeMultiplier defaults to 1.0 (no speed change)', () => {
    const stats = computePlayerStats(DEFAULT_GLOBAL_UPGRADE_STATE)
    expect(stats.castTimeMultiplier).toBe(1.0)
  })

  it('projectileSpeedMultiplier defaults to 1.0', () => {
    const stats = computePlayerStats(DEFAULT_GLOBAL_UPGRADE_STATE)
    expect(stats.projectileSpeedMultiplier).toBe(1.0)
  })

  it('spellAreaMultiplier defaults to 1.0', () => {
    const stats = computePlayerStats(DEFAULT_GLOBAL_UPGRADE_STATE)
    expect(stats.spellAreaMultiplier).toBe(1.0)
  })

  it('maxHp equals PLAYER_MAX_HP', () => {
    const stats = computePlayerStats(DEFAULT_GLOBAL_UPGRADE_STATE)
    expect(stats.maxHp).toBe(PLAYER_MAX_HP)
  })

  it('quickChainEnabled is false with no upgrade', () => {
    const stats = computePlayerStats(DEFAULT_GLOBAL_UPGRADE_STATE)
    expect(stats.quickChainEnabled).toBe(false)
  })

  it('quickChainWindowMs is 0 with no upgrade', () => {
    const stats = computePlayerStats(DEFAULT_GLOBAL_UPGRADE_STATE)
    expect(stats.quickChainWindowMs).toBe(0)
  })

  it('quickChainBonus is 0 with no upgrade', () => {
    const stats = computePlayerStats(DEFAULT_GLOBAL_UPGRADE_STATE)
    expect(stats.quickChainBonus).toBe(0)
  })

  it('critZoneTolerance is 0 with no upgrade', () => {
    const stats = computePlayerStats(DEFAULT_GLOBAL_UPGRADE_STATE)
    expect(stats.critZoneTolerance).toBe(0)
  })

  it('critStunChance is 0 with no upgrade', () => {
    const stats = computePlayerStats(DEFAULT_GLOBAL_UPGRADE_STATE)
    expect(stats.critStunChance).toBe(0)
  })

  it('critStunDurationMs is 0 with no upgrade', () => {
    const stats = computePlayerStats(DEFAULT_GLOBAL_UPGRADE_STATE)
    expect(stats.critStunDurationMs).toBe(0)
  })
})

// ============================================================
// Upgrade effects propagate correctly
// ============================================================

describe('computePlayerStats — upgrade propagation', () => {
  it('cast_time_1 reduces castTimeMultiplier below 1.0', () => {
    const stats = computePlayerStats(buildState('cast_time_1'))
    expect(stats.castTimeMultiplier).toBeLessThan(1.0)
    expect(stats.castTimeMultiplier).toBe(0.90)
  })

  it('cast_time tiers are strictly decreasing', () => {
    const t1 = computePlayerStats(buildState('cast_time_1')).castTimeMultiplier
    const t2 = computePlayerStats(buildState('cast_time_1', 'cast_time_2')).castTimeMultiplier
    const t3 = computePlayerStats(buildState('cast_time_1', 'cast_time_2', 'cast_time_3')).castTimeMultiplier
    expect(t2).toBeLessThan(t1)
    expect(t3).toBeLessThan(t2)
  })

  it('crit_dmg_1 increases critDamageMultiplier above baseline', () => {
    const stats = computePlayerStats(buildState('crit_dmg_1'))
    expect(stats.critDamageMultiplier).toBeGreaterThan(CRIT_DAMAGE_MULTIPLIER)
  })

  it('proj_speed_1 increases projectileSpeedMultiplier above 1.0', () => {
    const stats = computePlayerStats(buildState('proj_speed_1'))
    expect(stats.projectileSpeedMultiplier).toBeGreaterThan(1.0)
  })

  it('spell_area_1 increases spellAreaMultiplier above 1.0', () => {
    const stats = computePlayerStats(buildState('spell_area_1'))
    expect(stats.spellAreaMultiplier).toBeGreaterThan(1.0)
  })

  it('quick_chain_1 sets quickChainEnabled=true', () => {
    const stats = computePlayerStats(buildState('cast_time_1', 'quick_chain_1'))
    expect(stats.quickChainEnabled).toBe(true)
  })

  it('quick_chain_1 sets quickChainWindowMs > 0', () => {
    const stats = computePlayerStats(buildState('cast_time_1', 'quick_chain_1'))
    expect(stats.quickChainWindowMs).toBeGreaterThan(0)
  })

  it('quick_chain_1 sets quickChainBonus > 0', () => {
    const stats = computePlayerStats(buildState('cast_time_1', 'quick_chain_1'))
    expect(stats.quickChainBonus).toBeGreaterThan(0)
  })

  it('quick_chain_2 bonus exceeds quick_chain_1 bonus', () => {
    const b1 = computePlayerStats(buildState('cast_time_1', 'quick_chain_1')).quickChainBonus
    const b2 = computePlayerStats(buildState('cast_time_1', 'quick_chain_1', 'quick_chain_2')).quickChainBonus
    expect(b2).toBeGreaterThan(b1)
  })

  it('crit_zone_1 increases critZoneTolerance above 0', () => {
    const stats = computePlayerStats(buildState('crit_dmg_1', 'crit_zone_1'))
    expect(stats.critZoneTolerance).toBeGreaterThan(0)
  })

  it('crit_stun_1 sets critStunChance > 0', () => {
    const stats = computePlayerStats(buildState('crit_dmg_1', 'crit_dmg_2', 'crit_stun_1'))
    expect(stats.critStunChance).toBeGreaterThan(0)
  })

  it('crit_stun_1 sets critStunDurationMs > 0', () => {
    const stats = computePlayerStats(buildState('crit_dmg_1', 'crit_dmg_2', 'crit_stun_1'))
    expect(stats.critStunDurationMs).toBeGreaterThan(0)
  })
})

// ============================================================
// maxHp is always PLAYER_MAX_HP regardless of upgrades
// (no upgrade exists yet that changes maxHp)
// ============================================================

describe('computePlayerStats — maxHp invariant', () => {
  it('maxHp is PLAYER_MAX_HP regardless of upgrades applied', () => {
    // Apply all root-available nodes
    const state = buildState('cast_time_1', 'crit_dmg_1', 'proj_speed_1', 'spell_area_1')
    const stats = computePlayerStats(state)
    expect(stats.maxHp).toBe(PLAYER_MAX_HP)
  })
})

// ============================================================
// Pure function — does not mutate input
// ============================================================

describe('computePlayerStats — purity', () => {
  it('does not mutate the input GlobalUpgradeState', () => {
    const state: GlobalUpgradeState = {
      ...DEFAULT_GLOBAL_UPGRADE_STATE,
      unlockedNodeIds: [...DEFAULT_GLOBAL_UPGRADE_STATE.unlockedNodeIds],
    }
    const before = { ...state }
    computePlayerStats(state)
    expect(state.castTimeMultiplier).toBe(before.castTimeMultiplier)
    expect(state.critDamageMultiplier).toBe(before.critDamageMultiplier)
    expect(state.unlockedNodeIds).toEqual(before.unlockedNodeIds)
  })

  it('calling twice with same input returns identical values', () => {
    const state = buildState('cast_time_1', 'crit_dmg_1')
    const s1 = computePlayerStats(state)
    const s2 = computePlayerStats(state)
    const keys = Object.keys(s1) as (keyof PlayerStats)[]
    for (const k of keys) {
      expect(s1[k]).toBe(s2[k])
    }
  })
})

// ============================================================
// All UPGRADE_NODES fields are reflected in PlayerStats
// ============================================================

describe('computePlayerStats — upgrade tree coverage', () => {
  it('all upgrade node fields from UPGRADE_NODES are accessible via PlayerStats', () => {
    // Apply every node in dependency order and check that PlayerStats has the fields
    let s: GlobalUpgradeState = {
      ...DEFAULT_GLOBAL_UPGRADE_STATE,
      unlockedNodeIds: [...DEFAULT_GLOBAL_UPGRADE_STATE.unlockedNodeIds],
    }
    for (const node of UPGRADE_NODES) {
      if (s.unlockedNodeIds.includes(node.id)) continue
      const reqOk = node.requires.length === 0 || node.requires.some((d) => s.unlockedNodeIds.includes(d))
      if (reqOk) s = applyUpgradeNode(s, node.id)
    }
    const stats = computePlayerStats(s)
    // Sanity check: all fields exist and are numeric (or boolean)
    expect(typeof stats.critDamageMultiplier).toBe('number')
    expect(typeof stats.castTimeMultiplier).toBe('number')
    expect(typeof stats.projectileSpeedMultiplier).toBe('number')
    expect(typeof stats.spellAreaMultiplier).toBe('number')
    expect(typeof stats.maxHp).toBe('number')
    expect(typeof stats.quickChainEnabled).toBe('boolean')
    expect(typeof stats.quickChainWindowMs).toBe('number')
    expect(typeof stats.quickChainBonus).toBe('number')
    expect(typeof stats.critZoneTolerance).toBe('number')
    expect(typeof stats.critStunChance).toBe('number')
    expect(typeof stats.critStunDurationMs).toBe('number')
  })
})
