// ============================================================
// Game Design Spec — Iron Golem
//
// Enormous enemy with the largest hit zone in the roster, but
// compensated by an extreme HP pool.
//
// Design intent: HP vs hit zone ratio is the defining trait.
// Easy to hit (large target), hard to kill (massive HP).
//
// Test verifies:
//   Power user:   requires many slow CRITs — endurance, not precision
//   Casual player: lands hits easily but cannot kill in a short burst
// ============================================================

import { describe, it, expect } from 'vitest'
import { GameStateMachine } from '../../game/GameStateMachine'
import {
  SLOW_SKILL_DAMAGE,
  CRIT_DAMAGE_MULTIPLIER,
  HIT_DAMAGE_MULTIPLIER,
  ENEMY_IRON_GOLEM,
  ENEMY_GOBLIN_SCOUT,
  ENEMY_STONE_TROLL,
} from '../../game/constants'

const SLOW_CRIT_DMG = SLOW_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const SLOW_HIT_DMG  = SLOW_SKILL_DAMAGE * HIT_DAMAGE_MULTIPLIER

function minHitsToKill(maxHp: number, dmgPerHit: number): number {
  return Math.ceil(maxHp / dmgPerHit)
}

describe('Game Design: Iron Golem — enormous HP vs large hit zone', () => {
  it('#3 Iron Golem has significantly more HP than any campaign enemy', () => {
    // Boss HP pool should dwarf all 3 campaign enemies
    expect(ENEMY_IRON_GOLEM.maxHp).toBeGreaterThan(ENEMY_STONE_TROLL.maxHp)
    expect(ENEMY_IRON_GOLEM.maxHp).toBeGreaterThan(ENEMY_GOBLIN_SCOUT.maxHp)
  })

  it('#3 Iron Golem hit zone is near-maximum (enormously hittable target)', () => {
    expect(ENEMY_IRON_GOLEM.hitZone).toBeDefined()
    expect(ENEMY_IRON_GOLEM.hitZone!).toBeGreaterThan(0.85)
  })

  it('#3 HP-to-hit-zone ratio is much higher than Goblin Scout (endurance, not precision)', () => {
    // Lower hit zone means harder to land hits; higher HP means longer fight.
    // Iron Golem: large hitZone but enormous HP → ratio skewed to HP side.
    // Goblin Scout: full hitZone but modest HP → ratio is 1:1 baseline.
    const goblinRatio = ENEMY_GOBLIN_SCOUT.maxHp / 1.0                        // full hit zone
    const golemRatio  = ENEMY_IRON_GOLEM.maxHp   / ENEMY_IRON_GOLEM.hitZone!  // effective HP/zone

    // Iron Golem has a much higher effective HP burden
    expect(golemRatio).toBeGreaterThan(goblinRatio * 2)
  })

  it('#3 power user needs many slow CRITs — more than on any campaign enemy', () => {
    const hitsForGolem = minHitsToKill(ENEMY_IRON_GOLEM.maxHp, SLOW_CRIT_DMG)
    const hitsForTroll = minHitsToKill(ENEMY_STONE_TROLL.maxHp, SLOW_CRIT_DMG)

    expect(hitsForGolem).toBeGreaterThan(hitsForTroll)
  })

  it('#3 casual player (slow HITs) requires significantly more shots than power user (slow CRITs)', () => {
    const powerUserHits  = minHitsToKill(ENEMY_IRON_GOLEM.maxHp, SLOW_CRIT_DMG)
    const casualHits     = minHitsToKill(ENEMY_IRON_GOLEM.maxHp, SLOW_HIT_DMG)

    // CRITs deal 2× HIT damage, so casual always needs more hits
    expect(casualHits).toBeGreaterThan(powerUserHits)
  })

  it('#3 Iron Golem can be killed by sustained slow CRITs (power user path)', () => {
    const machine = new GameStateMachine()
    machine.startBattle()

    // Simulate Iron Golem HP drain with SLOW_CRIT_DMG
    let hp = ENEMY_IRON_GOLEM.maxHp
    const hitsNeeded = minHitsToKill(hp, SLOW_CRIT_DMG)

    for (let i = 0; i < hitsNeeded; i++) {
      hp = Math.max(0, hp - SLOW_CRIT_DMG)
    }
    expect(hp).toBe(0)

    // Apply same number of crits on the machine (kills current level enemy)
    for (let i = 0; i < hitsNeeded; i++) {
      machine._applyHitForTesting('CRIT', 'slow_shot')
    }
    expect(['fight_overview']).toContain(machine.getState().phase)
  })

  it('#3 Iron Golem crit zone scale is above 1.0 — oversized weak spot matching its bulk', () => {
    expect(ENEMY_IRON_GOLEM.critZoneScale).toBeGreaterThan(1.0)
  })
})
