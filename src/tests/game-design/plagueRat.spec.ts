// ============================================================
// Game Design Spec — Plague Rat
//
// Extremely small and erratically moving (zigzag) enemy.
// Design intent: damage ceiling is low (low HP), but the
// difficulty is entirely in landing any hit at all.
//
// Test verifies:
//   - hitZone and critZone are the lowest in the roster
//   - power user: can kill with precision shots
//   - casual player: most shots miss; effective kill time is long
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  SLOW_SKILL_DAMAGE,
  FAST_SKILL_DAMAGE,
  CRIT_DAMAGE_MULTIPLIER,
  HIT_DAMAGE_MULTIPLIER,
  ENEMY_PLAGUE_RAT,
  ENEMY_EMBER_WISP,
} from '../../game/constants'

const SLOW_CRIT_DMG = SLOW_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const FAST_CRIT_DMG = FAST_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const SLOW_HIT_DMG  = SLOW_SKILL_DAMAGE * HIT_DAMAGE_MULTIPLIER

function minHitsToKill(maxHp: number, dmgPerHit: number): number {
  return Math.ceil(maxHp / dmgPerHit)
}

function effectiveShotsNeeded(maxHp: number, dmgPerHit: number, hitZone: number): number {
  const rawHits = minHitsToKill(maxHp, dmgPerHit)
  return Math.ceil(rawHits / hitZone)
}

describe('Game Design: Plague Rat — accuracy is the obstacle, not HP', () => {
  it('#6 Plague Rat has a zigzag movement pattern', () => {
    expect(ENEMY_PLAGUE_RAT.movementPattern).toBe('zigzag')
  })

  it('#6 Plague Rat has a very low hit zone (most shots miss)', () => {
    expect(ENEMY_PLAGUE_RAT.hitZone).toBeDefined()
    expect(ENEMY_PLAGUE_RAT.hitZone!).toBeLessThan(0.3)
  })

  it('#6 Plague Rat crit zone is the smallest in tiny-class enemies', () => {
    expect(ENEMY_PLAGUE_RAT.critZone).toBeDefined()
    // Plague Rat crit zone ≤ Ember Wisp crit zone (both tiny but rat is zigzag)
    expect(ENEMY_PLAGUE_RAT.critZone!).toBeLessThanOrEqual(ENEMY_EMBER_WISP.critZone!)
  })

  it('#6 Plague Rat has low HP — damage is not the challenge', () => {
    // Low HP means it dies quickly IF you hit it
    const hitsToKill = minHitsToKill(ENEMY_PLAGUE_RAT.maxHp, SLOW_CRIT_DMG)
    expect(hitsToKill).toBeLessThanOrEqual(2) // dies in 1-2 precise hits
  })

  it('#6 effective shots (accounting for miss rate) are much higher than raw hits needed', () => {
    const rawHitsNeeded      = minHitsToKill(ENEMY_PLAGUE_RAT.maxHp, SLOW_HIT_DMG)
    const effectiveShots     = effectiveShotsNeeded(
      ENEMY_PLAGUE_RAT.maxHp, SLOW_HIT_DMG, ENEMY_PLAGUE_RAT.hitZone!
    )
    // Effective shots >> raw hits (most shots miss → many more attempts)
    expect(effectiveShots).toBeGreaterThan(rawHitsNeeded * 2)
  })

  it('#6 power user: can kill Plague Rat with 1-2 precise slow CRITs (damage math)', () => {
    // Check damage math: 1 or 2 slow CRITs should deplete Plague Rat HP
    const hitsNeeded = minHitsToKill(ENEMY_PLAGUE_RAT.maxHp, SLOW_CRIT_DMG)
    expect(hitsNeeded).toBeLessThanOrEqual(2)

    // Apply hits and verify HP drains to 0
    let hp = ENEMY_PLAGUE_RAT.maxHp
    for (let i = 0; i < hitsNeeded; i++) {
      hp = Math.max(0, hp - SLOW_CRIT_DMG)
    }
    expect(hp).toBe(0)
  })

  it('#6 fast CRIT can also kill Plague Rat (accessible alternative)', () => {
    const hitsNeeded = minHitsToKill(ENEMY_PLAGUE_RAT.maxHp, FAST_CRIT_DMG)
    let hp = ENEMY_PLAGUE_RAT.maxHp
    for (let i = 0; i < hitsNeeded; i++) {
      hp = Math.max(0, hp - FAST_CRIT_DMG)
    }
    expect(hp).toBe(0)
  })

  it('#6 Plague Rat size is tiny', () => {
    expect(ENEMY_PLAGUE_RAT.size).toBe('tiny')
  })
})
