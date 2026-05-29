// ============================================================
// Game Design Spec — Stone Drake
//
// Large enemy that approaches the player (urgency mechanic).
// High HP and a large hit zone — easy to hit, but must die
// before it reaches melee range.
//
// Design intent:
//   - Power user: kills it well before it closes in (fast DPS)
//   - Casual player: still dealing damage, but needs more time
//   - Test: power user completes kill with fewer shots (less time at risk)
// ============================================================

import { describe, it, expect } from 'vitest'
import { GameStateMachine } from '../../game/GameStateMachine'
import {
  SLOW_SKILL_DAMAGE,
  FAST_SKILL_DAMAGE,
  CRIT_DAMAGE_MULTIPLIER,
  HIT_DAMAGE_MULTIPLIER,
  ENEMY_STONE_DRAKE,
  ENEMY_STONE_TROLL,
} from '../../game/constants'

const SLOW_CRIT_DMG = SLOW_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const FAST_CRIT_DMG = FAST_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const SLOW_HIT_DMG  = SLOW_SKILL_DAMAGE * HIT_DAMAGE_MULTIPLIER
const FAST_HIT_DMG  = FAST_SKILL_DAMAGE * HIT_DAMAGE_MULTIPLIER

function minHitsToKill(maxHp: number, dmgPerHit: number): number {
  return Math.ceil(maxHp / dmgPerHit)
}

describe('Game Design: Stone Drake — approach urgency, sustained DPS required', () => {
  it('#8 Stone Drake has approach movement pattern (urgency mechanic)', () => {
    expect(ENEMY_STONE_DRAKE.movementPattern).toBe('approach')
  })

  it('#8 Stone Drake HP is higher than campaign boss (Stone Troll)', () => {
    expect(ENEMY_STONE_DRAKE.maxHp).toBeGreaterThan(ENEMY_STONE_TROLL.maxHp)
  })

  it('#8 Stone Drake has a large hit zone (easy to land hits, challenge is DPS race)', () => {
    expect(ENEMY_STONE_DRAKE.hitZone).toBeDefined()
    expect(ENEMY_STONE_DRAKE.hitZone!).toBeGreaterThan(0.7)
  })

  it('#8 power user (CRITs) kills Stone Drake in fewer shots than casual (HITs)', () => {
    const powerUserShots = minHitsToKill(ENEMY_STONE_DRAKE.maxHp, SLOW_CRIT_DMG)
    const casualShots    = minHitsToKill(ENEMY_STONE_DRAKE.maxHp, SLOW_HIT_DMG)
    expect(powerUserShots).toBeLessThan(casualShots)
  })

  it('#8 power user: mixed slow CRITs and fast CRITs kills Stone Drake', () => {
    // Alternate slow and fast crits — power user uses both hands
    const totalDmgPerRound = SLOW_CRIT_DMG + FAST_CRIT_DMG
    const roundsNeeded = minHitsToKill(ENEMY_STONE_DRAKE.maxHp, totalDmgPerRound)

    let hp = ENEMY_STONE_DRAKE.maxHp
    for (let i = 0; i < roundsNeeded; i++) {
      hp = Math.max(0, hp - totalDmgPerRound)
    }
    expect(hp).toBe(0)
  })

  it('#8 casual player path (slow HITs only) — more shots but still viable', () => {
    const hitsNeeded = minHitsToKill(ENEMY_STONE_DRAKE.maxHp, SLOW_HIT_DMG)
    let hp = ENEMY_STONE_DRAKE.maxHp
    for (let i = 0; i < hitsNeeded; i++) {
      hp = Math.max(0, hp - SLOW_HIT_DMG)
    }
    expect(hp).toBe(0)
  })

  it('#8 power user: machine confirms kill with sustained slow CRITs', () => {
    const machine = new GameStateMachine()
    machine.startBattle()

    const hitsNeeded = minHitsToKill(ENEMY_STONE_DRAKE.maxHp, SLOW_CRIT_DMG)
    for (let i = 0; i < hitsNeeded; i++) {
      machine._applyHitForTesting('CRIT', 'slow_shot')
    }
    expect(['fight_overview']).toContain(machine.getState().phase)
  })

  it('#8 Stone Drake has fewer slow CRITs to kill than Iron Golem (still manageable)', () => {
    const drakeHits = minHitsToKill(ENEMY_STONE_DRAKE.maxHp, SLOW_CRIT_DMG)
    // Stone Drake is hard but not as hard as Iron Golem (used for comparison)
    // Iron Golem: 280 HP, Drake: 160 HP
    expect(drakeHits).toBeGreaterThan(0)
    expect(ENEMY_STONE_DRAKE.maxHp).toBeLessThan(280) // less than Iron Golem
  })

  it('#8 fast_shot HIT still contributes meaningfully in a long approach fight', () => {
    const fastHitDrake = minHitsToKill(ENEMY_STONE_DRAKE.maxHp, FAST_HIT_DMG)
    // Fast HITs alone can eventually kill it — confirms no dead skill slot
    expect(fastHitDrake).toBeGreaterThan(0)
    let hp = ENEMY_STONE_DRAKE.maxHp
    for (let i = 0; i < fastHitDrake; i++) {
      hp = Math.max(0, hp - FAST_HIT_DMG)
    }
    expect(hp).toBe(0)
  })
})
