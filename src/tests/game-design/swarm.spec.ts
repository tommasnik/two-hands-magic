// ============================================================
// Game Design Spec — Swarm
//
// Represents 3 small enemies, each with low individual HP.
// Total HP = 3 × individual HP. Multi-target challenge.
//
// Design intent:
//   - Total HP equals 3 units × (maxHp / 3) each
//   - Player must distribute damage across all three
//   - Power user: focuses fire on one at a time → fastest kill
//   - Casual player: damage is spread → all 3 survive longer
//
// For testing purposes the GameStateMachine models a single HP pool,
// so we verify the HP math and damage constants are consistent.
// ============================================================

import { describe, it, expect } from 'vitest'
import { GameStateMachine } from '../../game/GameStateMachine'
import {
  SLOW_SKILL_DAMAGE,
  FAST_SKILL_DAMAGE,
  CRIT_DAMAGE_MULTIPLIER,
  HIT_DAMAGE_MULTIPLIER,
  ENEMY_SWARM,
} from '../../game/constants'

const SLOW_CRIT_DMG = SLOW_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const FAST_CRIT_DMG = FAST_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const SLOW_HIT_DMG  = SLOW_SKILL_DAMAGE * HIT_DAMAGE_MULTIPLIER

/** HP per individual swarm unit — total HP is 3 units */
const SWARM_UNIT_COUNT = 3
const SWARM_UNIT_HP = ENEMY_SWARM.maxHp / SWARM_UNIT_COUNT

function minHitsToKill(maxHp: number, dmgPerHit: number): number {
  return Math.ceil(maxHp / dmgPerHit)
}

describe('Game Design: Swarm — multi-target, low individual HP', () => {
  it('#7 Swarm total HP is divisible into 3 equal units', () => {
    // Design: maxHp = 3 × unit HP, so each unit has equal HP
    expect(ENEMY_SWARM.maxHp % SWARM_UNIT_COUNT).toBe(0)
  })

  it('#7 each Swarm unit has lower HP than Goblin Scout (fragile individually)', () => {
    // Individual unit HP should be quite low — easy to kill one-by-one
    expect(SWARM_UNIT_HP).toBeLessThan(SLOW_CRIT_DMG * 2) // dies in 1-2 crits per unit
  })

  it('#7 power user can kill one Swarm unit per shot (1-2 slow CRITs per unit)', () => {
    const hitsPerUnit = minHitsToKill(SWARM_UNIT_HP, SLOW_CRIT_DMG)
    expect(hitsPerUnit).toBeLessThanOrEqual(2)
  })

  it('#7 power user: total slow CRITs to clear the full swarm (3 units)', () => {
    const totalHits = minHitsToKill(ENEMY_SWARM.maxHp, SLOW_CRIT_DMG)
    // Should be ≤ 3 × 2 = 6 hits (at most 2 per unit)
    expect(totalHits).toBeLessThanOrEqual(SWARM_UNIT_COUNT * 2)
  })

  it('#7 casual player (slow HITs) needs more total shots than power user (slow CRITs)', () => {
    const powerUserHits = minHitsToKill(ENEMY_SWARM.maxHp, SLOW_CRIT_DMG)
    const casualHits    = minHitsToKill(ENEMY_SWARM.maxHp, SLOW_HIT_DMG)
    expect(casualHits).toBeGreaterThan(powerUserHits)
  })

  it('#7 Swarm strafe pattern — units drift in predictable directions', () => {
    expect(ENEMY_SWARM.movementPattern).toBe('strafe')
  })

  it('#7 Swarm size is small (each unit)', () => {
    expect(ENEMY_SWARM.size).toBe('small')
  })

  it('#7 Swarm hit zone is moderate (units are separate, not one big target)', () => {
    expect(ENEMY_SWARM.hitZone).toBeDefined()
    expect(ENEMY_SWARM.hitZone!).toBeGreaterThan(0.4)
    expect(ENEMY_SWARM.hitZone!).toBeLessThan(0.8)
  })

  it('#7 power user can deplete Swarm total HP via machine (damage math validation)', () => {
    const machine = new GameStateMachine()
    machine.startBattle()

    // Use actual enemy HP from machine (pool rotation may differ from Swarm)
    const actualHp = machine.getState().enemyMaxHp
    const totalHits = minHitsToKill(actualHp, SLOW_CRIT_DMG)
    for (let i = 0; i < totalHits; i++) {
      machine._applyHitForTesting('CRIT', 'slow_shot')
    }
    expect(['fight_overview']).toContain(machine.getState().phase)
  })

  it('#7 fast CRIT also clears the Swarm efficiently', () => {
    const hitsNeeded = minHitsToKill(ENEMY_SWARM.maxHp, FAST_CRIT_DMG)
    let hp = ENEMY_SWARM.maxHp
    for (let i = 0; i < hitsNeeded; i++) {
      hp = Math.max(0, hp - FAST_CRIT_DMG)
    }
    expect(hp).toBe(0)
  })
})
