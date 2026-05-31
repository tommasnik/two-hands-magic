// ============================================================
// CombatSystem unit tests
// ============================================================

import { describe, it, expect } from 'vitest'
import { CombatSystem, initSkillFightStats } from '../../game/systems/CombatSystem'
import { StatusEffectSystem } from '../../game/systems/StatusEffectSystem'
import { Enemy } from '../../game/entities/Enemy'
import { GAME_WIDTH, ENEMY_DEFAULT_Y, DEFAULT_GLOBAL_UPGRADE_STATE } from '../../game/constants'
import type { HitContext } from '../../game/systems/CombatSystem'

// Ensure skill modules are registered
import '../../game/skills/index'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCombatSystem(): CombatSystem {
  return new CombatSystem(new StatusEffectSystem())
}

function makeEnemy(): Enemy {
  return new Enemy(GAME_WIDTH / 2, ENEMY_DEFAULT_Y)
}

function makeCtx(overrides: Partial<HitContext> = {}): HitContext {
  const enemy = makeEnemy()
  return {
    elapsedMs: 1000,
    enemyHp: 30,
    enemy,
    globalUpgrades: { ...DEFAULT_GLOBAL_UPGRADE_STATE, unlockedNodeIds: [] },
    enemyStateSlice: { hp: 30, maxHp: 30, activeStatusEffects: [] },
    rng: () => 0.5,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// initSkillFightStats helper
// ---------------------------------------------------------------------------

describe('initSkillFightStats', () => {
  it('creates zeroed stats for a skill type', () => {
    const stats = initSkillFightStats('fireball')
    expect(stats.skillType).toBe('fireball')
    expect(stats.fireCount).toBe(0)
    expect(stats.totalDamage).toBe(0)
    expect(stats.hitsByResult).toEqual({ CRIT: 0, HIT: 0, GRAZE: 0, MISS: 0 })
    expect(stats.touchGaps).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// CombatSystem — initial state
// ---------------------------------------------------------------------------

describe('CombatSystem — initial state', () => {
  it('starts with zero score', () => {
    const cs = makeCombatSystem()
    expect(cs.score).toEqual({ total: 0, crits: 0, hits: 0, grazes: 0, misses: 0 })
  })

  it('starts with no lastHit', () => {
    const cs = makeCombatSystem()
    expect(cs.lastHit).toBeNull()
  })

  it('starts with empty lastCastBySlot', () => {
    const cs = makeCombatSystem()
    expect(cs.lastCastBySlot).toEqual({})
  })

  it('starts with no fightStatsSnapshot', () => {
    const cs = makeCombatSystem()
    expect(cs.fightStatsSnapshot).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// CombatSystem — score tracking
// ---------------------------------------------------------------------------

describe('CombatSystem — score tracking via processHit', () => {
  it('CRIT increments score.total and score.crits', () => {
    const cs = makeCombatSystem()
    cs.fightStats = { left: initSkillFightStats('fireball'), right: initSkillFightStats('white_shot'), durationMs: 0 }
    cs.processHit('CRIT', 'fireball', null, 0, 0, 'left', makeCtx())
    expect(cs.score.crits).toBe(1)
    expect(cs.score.total).toBeGreaterThan(0)
  })

  it('HIT increments score.hits', () => {
    const cs = makeCombatSystem()
    cs.fightStats = { left: initSkillFightStats('fireball'), right: initSkillFightStats('white_shot'), durationMs: 0 }
    cs.processHit('HIT', 'fireball', null, 0, 0, 'left', makeCtx())
    expect(cs.score.hits).toBe(1)
  })

  it('GRAZE increments score.grazes', () => {
    const cs = makeCombatSystem()
    cs.fightStats = { left: initSkillFightStats('fireball'), right: initSkillFightStats('white_shot'), durationMs: 0 }
    cs.processHit('GRAZE', 'fireball', null, 0, 0, 'left', makeCtx())
    expect(cs.score.grazes).toBe(1)
  })

  it('MISS increments score.misses and returns 0 damage', () => {
    const cs = makeCombatSystem()
    cs.fightStats = { left: initSkillFightStats('fireball'), right: initSkillFightStats('white_shot'), durationMs: 0 }
    const { damage } = cs.processHit('MISS', 'fireball', null, 0, 0, 'left', makeCtx())
    expect(cs.score.misses).toBe(1)
    expect(damage).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// CombatSystem — processHit damage and enemyDied
// ---------------------------------------------------------------------------

describe('CombatSystem — processHit result', () => {
  it('returns damage > 0 for CRIT', () => {
    const cs = makeCombatSystem()
    cs.fightStats = { left: initSkillFightStats('white_shot'), right: initSkillFightStats('white_shot'), durationMs: 0 }
    const { damage } = cs.processHit('CRIT', 'white_shot', null, 0, 0, 'left', makeCtx())
    expect(damage).toBeGreaterThan(0)
  })

  it('enemyDied is true when damage >= enemyHp', () => {
    const cs = makeCombatSystem()
    cs.fightStats = { left: initSkillFightStats('fireball'), right: initSkillFightStats('fireball'), durationMs: 0 }
    // Give enemy just 1 HP so any CRIT kills it
    const ctx = makeCtx({ enemyHp: 1 })
    const { enemyDied } = cs.processHit('CRIT', 'fireball', null, 0, 0, 'left', ctx)
    expect(enemyDied).toBe(true)
  })

  it('enemyDied is false when enemy survives', () => {
    const cs = makeCombatSystem()
    cs.fightStats = { left: initSkillFightStats('white_shot'), right: initSkillFightStats('white_shot'), durationMs: 0 }
    const ctx = makeCtx({ enemyHp: 10000 }) // lots of HP
    const { enemyDied } = cs.processHit('CRIT', 'white_shot', null, 0, 0, 'left', ctx)
    expect(enemyDied).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// CombatSystem — computeChainBonus
// ---------------------------------------------------------------------------

describe('CombatSystem — computeChainBonus', () => {
  it('returns 0 when quickChainBonus is 0', () => {
    const cs = makeCombatSystem()
    const upgrades = { ...DEFAULT_GLOBAL_UPGRADE_STATE, unlockedNodeIds: [], quickChainBonus: 0 }
    expect(cs.computeChainBonus('left_0', 1000, upgrades)).toBe(0)
  })

  it('returns 0 when no other slot has fired', () => {
    const cs = makeCombatSystem()
    const upgrades = { ...DEFAULT_GLOBAL_UPGRADE_STATE, unlockedNodeIds: [], quickChainBonus: 0.5, quickChainWindowMs: 300 }
    expect(cs.computeChainBonus('left_0', 1000, upgrades)).toBe(0)
  })

  it('returns bonus when another slot fired within window', () => {
    const cs = makeCombatSystem()
    cs.lastCastBySlot['right_0'] = 900 // fired 100ms ago
    const upgrades = { ...DEFAULT_GLOBAL_UPGRADE_STATE, unlockedNodeIds: [], quickChainBonus: 0.5, quickChainWindowMs: 300 }
    expect(cs.computeChainBonus('left_0', 1000, upgrades)).toBe(0.5)
  })

  it('returns 0 when other slot fired outside window', () => {
    const cs = makeCombatSystem()
    cs.lastCastBySlot['right_0'] = 600 // fired 400ms ago, outside 300ms window
    const upgrades = { ...DEFAULT_GLOBAL_UPGRADE_STATE, unlockedNodeIds: [], quickChainBonus: 0.5, quickChainWindowMs: 300 }
    expect(cs.computeChainBonus('left_0', 1000, upgrades)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// CombatSystem — snapshotFightStats
// ---------------------------------------------------------------------------

describe('CombatSystem — snapshotFightStats', () => {
  it('creates a deep clone of current fightStats', () => {
    const cs = makeCombatSystem()
    cs.fightStats = {
      left: initSkillFightStats('fireball'),
      right: initSkillFightStats('white_shot'),
      durationMs: 500,
    }
    cs.fightStats.left.fireCount = 3
    cs.snapshotFightStats()
    expect(cs.fightStatsSnapshot).not.toBeNull()
    expect(cs.fightStatsSnapshot!.left.fireCount).toBe(3)
    expect(cs.fightStatsSnapshot!.durationMs).toBe(500)
    // Verify deep clone — mutating fightStats does not affect snapshot
    cs.fightStats.left.fireCount = 99
    expect(cs.fightStatsSnapshot!.left.fireCount).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// CombatSystem — resetForLevel
// ---------------------------------------------------------------------------

describe('CombatSystem — resetForLevel', () => {
  it('clears lastCastBySlot and fightStatsSnapshot', () => {
    const cs = makeCombatSystem()
    cs.lastCastBySlot['left_0'] = 1000
    cs.fightStatsSnapshot = { left: initSkillFightStats('fireball'), right: initSkillFightStats('white_shot'), durationMs: 0 }
    cs.resetForLevel()
    expect(cs.lastCastBySlot).toEqual({})
    expect(cs.fightStatsSnapshot).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// CombatSystem — serializeFightStats
// ---------------------------------------------------------------------------

describe('CombatSystem — serializeFightStats', () => {
  it('returns a deep clone of fightStats', () => {
    const cs = makeCombatSystem()
    const stats = {
      left: initSkillFightStats('fireball'),
      right: initSkillFightStats('white_shot'),
      durationMs: 1000,
    }
    stats.left.touchGaps.push(150)
    const serialized = cs.serializeFightStats(stats)
    expect(serialized).not.toBe(stats) // different object
    expect(serialized.left.touchGaps).toEqual([150])
    // Mutating original does not affect copy
    stats.left.touchGaps.push(200)
    expect(serialized.left.touchGaps).toHaveLength(1)
  })
})
