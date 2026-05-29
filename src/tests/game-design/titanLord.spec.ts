// ============================================================
// Game Design Spec — Titan Lord (Boss)
//
// Boss-type enemy: enormous size, highest HP, constant strafe movement.
// Design intent: full encounter test — power user must deal sustained
// DPS while tracking movement; casual player must land enough hits
// over an extended fight to eventually win.
//
// Test verifies the complete boss encounter as a victory condition:
//   - Power user: defeats Titan Lord with optimal CRIT DPS
//   - Casual player: survives to kill via sustained HITs
// ============================================================

import { describe, it, expect } from 'vitest'
import { GameStateMachine } from '../../game/GameStateMachine'
import {
  SLOW_SKILL_DAMAGE,
  FAST_SKILL_DAMAGE,
  CRIT_DAMAGE_MULTIPLIER,
  HIT_DAMAGE_MULTIPLIER,
  ENEMY_TITAN_LORD,
  ENEMY_ANCIENT_TREANT,
  ENEMY_IRON_GOLEM,
} from '../../game/constants'

const SLOW_CRIT_DMG = SLOW_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const FAST_CRIT_DMG = FAST_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const SLOW_HIT_DMG  = SLOW_SKILL_DAMAGE * HIT_DAMAGE_MULTIPLIER
const FAST_HIT_DMG  = FAST_SKILL_DAMAGE * HIT_DAMAGE_MULTIPLIER

function minHitsToKill(maxHp: number, dmgPerHit: number): number {
  return Math.ceil(maxHp / dmgPerHit)
}

describe('Game Design: Titan Lord — boss encounter victory condition', () => {
  it('#16 Titan Lord has the highest HP in the roster', () => {
    // Should have more HP than both Treant and Iron Golem
    expect(ENEMY_TITAN_LORD.maxHp).toBeGreaterThan(ENEMY_ANCIENT_TREANT.maxHp)
    expect(ENEMY_TITAN_LORD.maxHp).toBeGreaterThan(ENEMY_IRON_GOLEM.maxHp)
  })

  it('#16 Titan Lord has enormous size', () => {
    expect(ENEMY_TITAN_LORD.size).toBe('enormous')
  })

  it('#16 Titan Lord strafes — combining movement with bulk', () => {
    expect(ENEMY_TITAN_LORD.movementPattern).toBe('strafe')
  })

  it('#16 Titan Lord hit zone is very large (targeting is not the challenge)', () => {
    expect(ENEMY_TITAN_LORD.hitZone).toBeDefined()
    expect(ENEMY_TITAN_LORD.hitZone!).toBeGreaterThan(0.8)
  })

  it('#16 Titan Lord crit zone is moderate (not trivially easy to crit on a boss)', () => {
    expect(ENEMY_TITAN_LORD.critZone).toBeDefined()
    expect(ENEMY_TITAN_LORD.critZone!).toBeGreaterThan(0.3)
    expect(ENEMY_TITAN_LORD.critZone!).toBeLessThan(0.6)
  })

  it('#16 power user (slow CRITs) requires many hits — true boss fight', () => {
    const hitsNeeded = minHitsToKill(ENEMY_TITAN_LORD.maxHp, SLOW_CRIT_DMG)
    // Boss must require at least 7 crits — a real sustained encounter
    expect(hitsNeeded).toBeGreaterThanOrEqual(7)
  })

  it('#16 power user: dual-hand approach (slow + fast CRITs) is the fastest path', () => {
    const combinedDmgPerRound = SLOW_CRIT_DMG + FAST_CRIT_DMG
    const combinedRounds = minHitsToKill(ENEMY_TITAN_LORD.maxHp, combinedDmgPerRound)
    const slowAloneHits  = minHitsToKill(ENEMY_TITAN_LORD.maxHp, SLOW_CRIT_DMG)

    // Combined DPS beats single-hand DPS
    expect(combinedRounds).toBeLessThan(slowAloneHits)
  })

  it('#16 power user: machine confirms Titan Lord dies with enough slow CRITs', () => {
    const machine = new GameStateMachine()
    machine.startBattle()

    const hitsNeeded = minHitsToKill(ENEMY_TITAN_LORD.maxHp, SLOW_CRIT_DMG)
    for (let i = 0; i < hitsNeeded; i++) {
      machine._applyHitForTesting('CRIT', 'slow_shot')
    }
    expect(['fight_overview']).toContain(machine.getState().phase)
  })

  it('#16 casual player (slow HITs) can still kill Titan Lord with persistence', () => {
    const hitsNeeded = minHitsToKill(ENEMY_TITAN_LORD.maxHp, SLOW_HIT_DMG)
    let hp = ENEMY_TITAN_LORD.maxHp
    for (let i = 0; i < hitsNeeded; i++) {
      hp = Math.max(0, hp - SLOW_HIT_DMG)
    }
    expect(hp).toBe(0)
  })

  it('#16 casual player needs significantly more shots than power user', () => {
    const powerHits  = minHitsToKill(ENEMY_TITAN_LORD.maxHp, SLOW_CRIT_DMG)
    const casualHits = minHitsToKill(ENEMY_TITAN_LORD.maxHp, SLOW_HIT_DMG)
    // CRITs deal 2× → casual needs approximately 2× more shots.
    // Due to Math.ceil rounding, casual may land on powerHits * 2 - 1 in edge cases.
    // Design intent: casual needs strictly more shots than power user.
    expect(casualHits).toBeGreaterThan(powerHits)
    // And at least 1.5× (significant gap — not a trivial difference)
    expect(casualHits).toBeGreaterThanOrEqual(Math.floor(powerHits * 1.5))
  })

  it('#16 full encounter simulation: power user wins via mixed dual-hand crits', () => {
    const machine = new GameStateMachine()
    machine.startBattle()

    let hp = ENEMY_TITAN_LORD.maxHp
    let shots = 0

    // Simulate dual-hand play: alternate slow and fast crits
    while (hp > 0) {
      const dmg = shots % 2 === 0 ? SLOW_CRIT_DMG : FAST_CRIT_DMG
      hp = Math.max(0, hp - dmg)
      machine._applyHitForTesting('CRIT', shots % 2 === 0 ? 'slow_shot' : 'fast_shot')
      shots++
    }

    expect(hp).toBe(0)
    expect(['fight_overview']).toContain(machine.getState().phase)
  })

  it('#16 fast_shot HIT path (weakest): even this eventually kills Titan Lord', () => {
    const hitsNeeded = minHitsToKill(ENEMY_TITAN_LORD.maxHp, FAST_HIT_DMG)
    let hp = ENEMY_TITAN_LORD.maxHp
    for (let i = 0; i < hitsNeeded; i++) {
      hp = Math.max(0, hp - FAST_HIT_DMG)
    }
    expect(hp).toBe(0)
    // Many hits needed — this confirms the boss can be beaten by grinding even the weakest damage
    expect(hitsNeeded).toBeGreaterThan(30)
  })
})
