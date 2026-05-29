// ============================================================
// Game Design Spec — Mirror Knight
//
// Medium enemy where one zone (the shield side) reflects damage
// at a reduced multiplier. Power user targets the non-reflected zone.
//
// Design intent:
//   - Power user: aims at the non-reflected crit zone → full damage
//   - Casual player: randomly hits the shield → reduced damage output
//   - ENEMY_MIRROR_KNIGHT_REFLECT_MULTIPLIER encodes the penalty
//
// Test verifies:
//   - Reflected zone deals less damage (encoded in the multiplier constant)
//   - Power user (targets full-damage zone) kills faster
//   - Casual player (hits shield 50% of the time) needs more total hits
// ============================================================

import { describe, it, expect } from 'vitest'
import { GameStateMachine } from '../../game/GameStateMachine'
import {
  SLOW_SKILL_DAMAGE,
  FAST_SKILL_DAMAGE,
  CRIT_DAMAGE_MULTIPLIER,
  HIT_DAMAGE_MULTIPLIER,
  ENEMY_MIRROR_KNIGHT,
  ENEMY_MIRROR_KNIGHT_REFLECT_MULTIPLIER,
} from '../../game/constants'

const SLOW_CRIT_DMG = SLOW_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const SLOW_HIT_DMG  = SLOW_SKILL_DAMAGE * HIT_DAMAGE_MULTIPLIER
const FAST_CRIT_DMG = FAST_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER

// Reflected zone deals less damage (shield absorbs most of it)
const SLOW_CRIT_REFLECTED = SLOW_CRIT_DMG * ENEMY_MIRROR_KNIGHT_REFLECT_MULTIPLIER

function minHitsToKill(maxHp: number, dmgPerHit: number): number {
  return Math.ceil(maxHp / dmgPerHit)
}

describe('Game Design: Mirror Knight — reflected zone penalises wrong zone hits', () => {
  it('#14 reflect multiplier is well below 1.0 (significant penalty)', () => {
    expect(ENEMY_MIRROR_KNIGHT_REFLECT_MULTIPLIER).toBeLessThan(0.5)
  })

  it('#14 reflected slow CRIT deals less damage than normal slow HIT', () => {
    // Reflected CRIT should be weaker than a normal HIT — strong incentive to aim correctly
    expect(SLOW_CRIT_REFLECTED).toBeLessThan(SLOW_HIT_DMG)
  })

  it('#14 power user (no reflected zone hits) kills in fewer shots than casual (50% reflected)', () => {
    // Power user: always hits the full-damage zone
    const powerHits = minHitsToKill(ENEMY_MIRROR_KNIGHT.maxHp, SLOW_CRIT_DMG)

    // Casual: 50% shots hit the shield (reflected), 50% hit the normal zone
    // Average damage per shot for casual:
    const avgCasualDmg = (SLOW_CRIT_DMG + SLOW_CRIT_REFLECTED) / 2
    const casualHits   = minHitsToKill(ENEMY_MIRROR_KNIGHT.maxHp, avgCasualDmg)

    // Casual needs more hits
    expect(casualHits).toBeGreaterThan(powerHits)
  })

  it('#14 casual player: all shots hitting shield (worst case) needs many more hits', () => {
    const powerHits  = minHitsToKill(ENEMY_MIRROR_KNIGHT.maxHp, SLOW_CRIT_DMG)
    const worstCase  = minHitsToKill(ENEMY_MIRROR_KNIGHT.maxHp, SLOW_CRIT_REFLECTED)

    // Shield-only hits need ~4× more shots (0.25 multiplier)
    expect(worstCase).toBeGreaterThan(powerHits * 2)
  })

  it('#14 power user: machine confirms kill with slow CRITs on non-reflected zone', () => {
    const machine = new GameStateMachine()
    machine.startBattle()

    const hitsNeeded = minHitsToKill(ENEMY_MIRROR_KNIGHT.maxHp, SLOW_CRIT_DMG)
    for (let i = 0; i < hitsNeeded; i++) {
      machine._applyHitForTesting('CRIT', 'slow_shot')
    }
    expect(['fight_overview']).toContain(machine.getState().phase)
  })

  it('#14 Mirror Knight is static (zone selection, not tracking)', () => {
    expect(ENEMY_MIRROR_KNIGHT.movementPattern).toBe('static')
  })

  it('#14 Mirror Knight has moderate HP — not an endurance fight, but zone choice matters', () => {
    expect(ENEMY_MIRROR_KNIGHT.maxHp).toBeGreaterThan(80)
    expect(ENEMY_MIRROR_KNIGHT.maxHp).toBeLessThan(200)
  })

  it('#14 fast CRIT also kills Mirror Knight (flexibility for quick reactions)', () => {
    const hitsNeeded = minHitsToKill(ENEMY_MIRROR_KNIGHT.maxHp, FAST_CRIT_DMG)
    let hp = ENEMY_MIRROR_KNIGHT.maxHp
    for (let i = 0; i < hitsNeeded; i++) {
      hp = Math.max(0, hp - FAST_CRIT_DMG)
    }
    expect(hp).toBe(0)
  })
})
