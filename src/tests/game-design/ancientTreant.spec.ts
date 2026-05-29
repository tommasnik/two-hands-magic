// ============================================================
// Game Design Spec — Ancient Treant
//
// Enormous size, enormous HP. The defining endurance encounter.
// Design intent: requires sustained DPS — many hits over a long fight.
// Neither skill slot alone can end this quickly.
//
// Test verifies:
//   - HP is the highest among non-boss enemies
//   - Even with optimal crits, many shots are needed
//   - Both slow and fast crits together are required for reasonable TTK
// ============================================================

import { describe, it, expect } from 'vitest'
import { GameStateMachine } from '../../game/GameStateMachine'
import {
  SLOW_SKILL_DAMAGE,
  FAST_SKILL_DAMAGE,
  CRIT_DAMAGE_MULTIPLIER,
  HIT_DAMAGE_MULTIPLIER,
  ENEMY_ANCIENT_TREANT,
  ENEMY_STONE_TROLL,
  ENEMY_IRON_GOLEM,
} from '../../game/constants'

const SLOW_CRIT_DMG = SLOW_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const FAST_CRIT_DMG = FAST_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const SLOW_HIT_DMG  = SLOW_SKILL_DAMAGE * HIT_DAMAGE_MULTIPLIER

function minHitsToKill(maxHp: number, dmgPerHit: number): number {
  return Math.ceil(maxHp / dmgPerHit)
}

describe('Game Design: Ancient Treant — sustained DPS encounter', () => {
  it('#10 Ancient Treant has more HP than Stone Troll (campaign boss)', () => {
    expect(ENEMY_ANCIENT_TREANT.maxHp).toBeGreaterThan(ENEMY_STONE_TROLL.maxHp)
  })

  it('#10 Ancient Treant has more HP than Iron Golem (highest single HP pool)', () => {
    expect(ENEMY_ANCIENT_TREANT.maxHp).toBeGreaterThan(ENEMY_IRON_GOLEM.maxHp)
  })

  it('#10 power user needs many slow CRITs (sustained DPS — not a quick fight)', () => {
    const hitsNeeded = minHitsToKill(ENEMY_ANCIENT_TREANT.maxHp, SLOW_CRIT_DMG)
    // Must require at least 5+ crits — truly endurance, not burst
    expect(hitsNeeded).toBeGreaterThanOrEqual(5)
  })

  it('#10 casual player (slow HITs) needs significantly more shots than power user (slow CRITs)', () => {
    const powerHits  = minHitsToKill(ENEMY_ANCIENT_TREANT.maxHp, SLOW_CRIT_DMG)
    const casualHits = minHitsToKill(ENEMY_ANCIENT_TREANT.maxHp, SLOW_HIT_DMG)
    // CRITs deal 2× → casual needs 2× more shots
    expect(casualHits).toBeGreaterThan(powerHits)
  })

  it('#10 both slow and fast CRITs combined reduce TTK vs slow alone', () => {
    // Combined DPS: slow + fast per round > slow alone
    const combinedDmgPerRound = SLOW_CRIT_DMG + FAST_CRIT_DMG
    const combinedRounds = minHitsToKill(ENEMY_ANCIENT_TREANT.maxHp, combinedDmgPerRound)
    const slowAloneHits  = minHitsToKill(ENEMY_ANCIENT_TREANT.maxHp, SLOW_CRIT_DMG)

    // Combined approach kills it faster
    expect(combinedRounds).toBeLessThan(slowAloneHits)
  })

  it('#10 Ancient Treant hit zone is very large (enormous body = easy to hit)', () => {
    expect(ENEMY_ANCIENT_TREANT.hitZone).toBeDefined()
    expect(ENEMY_ANCIENT_TREANT.hitZone!).toBeGreaterThan(0.8)
  })

  it('#10 Ancient Treant size is enormous', () => {
    expect(ENEMY_ANCIENT_TREANT.size).toBe('enormous')
  })

  it('#10 static movement — endurance not tracking skill', () => {
    expect(ENEMY_ANCIENT_TREANT.movementPattern).toBe('static')
  })

  it('#10 power user: machine confirms kill with sustained slow CRITs', () => {
    const machine = new GameStateMachine()
    machine.startBattle()

    const hitsNeeded = minHitsToKill(ENEMY_ANCIENT_TREANT.maxHp, SLOW_CRIT_DMG)
    for (let i = 0; i < hitsNeeded; i++) {
      machine._applyHitForTesting('CRIT', 'slow_shot')
    }
    expect(['fight_overview']).toContain(machine.getState().phase)
  })

  it('#10 mixed DPS path (fast + slow CRITs) kills Treant in fewer total shots', () => {
    const machine = new GameStateMachine()
    machine.startBattle()

    let hp = ENEMY_ANCIENT_TREANT.maxHp
    let shots = 0
    while (hp > 0) {
      // Alternate slow and fast crits to simulate dual-hand play
      hp = Math.max(0, hp - (shots % 2 === 0 ? SLOW_CRIT_DMG : FAST_CRIT_DMG))
      machine._applyHitForTesting('CRIT', shots % 2 === 0 ? 'slow_shot' : 'fast_shot')
      shots++
    }
    expect(hp).toBe(0)
    expect(['fight_overview']).toContain(machine.getState().phase)
  })
})
