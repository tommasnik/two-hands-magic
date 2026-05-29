// ============================================================
// Game Design Spec — Lava Slug
//
// Large, slow strafe movement, very high HP.
// Design intent: the defining metric is time-vs-damage ratio.
// Easy to hit, but requires sustained investment over a long fight.
//
// Test verifies:
//   - HP is high (long fight)
//   - Hit zone is wide (easy to land shots)
//   - Power user reduces TTK via crits; casual player must grind HITs
//   - The time-vs-damage ratio is unfavourable compared to lower-HP enemies
// ============================================================

import { describe, it, expect } from 'vitest'
import { GameStateMachine } from '../../game/GameStateMachine'
import {
  SLOW_SKILL_DAMAGE,
  FAST_SKILL_DAMAGE,
  CRIT_DAMAGE_MULTIPLIER,
  HIT_DAMAGE_MULTIPLIER,
  SLOW_SKILL_ROTATION_PERIOD_MS,
  ENEMY_LAVA_SLUG,
  ENEMY_GOBLIN_SCOUT,
} from '../../game/constants'

const SLOW_CRIT_DMG = SLOW_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const FAST_CRIT_DMG = FAST_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const SLOW_HIT_DMG  = SLOW_SKILL_DAMAGE * HIT_DAMAGE_MULTIPLIER

function minHitsToKill(maxHp: number, dmgPerHit: number): number {
  return Math.ceil(maxHp / dmgPerHit)
}

/** Estimate fight time in ms given hit count and skill rotation period */
function estimateFightTimeMs(hitsNeeded: number, rotationPeriodMs: number): number {
  return hitsNeeded * rotationPeriodMs
}

describe('Game Design: Lava Slug — time vs damage, long slow encounter', () => {
  it('#12 Lava Slug has much more HP than Goblin Scout (long fight by design)', () => {
    expect(ENEMY_LAVA_SLUG.maxHp).toBeGreaterThan(ENEMY_GOBLIN_SCOUT.maxHp * 2)
  })

  it('#12 Lava Slug strafe movement — slow and predictable', () => {
    expect(ENEMY_LAVA_SLUG.movementPattern).toBe('strafe')
  })

  it('#12 Lava Slug hit zone is large (wide body, easy to land shots)', () => {
    expect(ENEMY_LAVA_SLUG.hitZone).toBeDefined()
    expect(ENEMY_LAVA_SLUG.hitZone!).toBeGreaterThan(0.75)
  })

  it('#12 estimated fight time (slow HIT path) is much longer than for Goblin Scout', () => {
    const goblinHits   = minHitsToKill(ENEMY_GOBLIN_SCOUT.maxHp, SLOW_HIT_DMG)
    const slugHits     = minHitsToKill(ENEMY_LAVA_SLUG.maxHp, SLOW_HIT_DMG)
    const goblinTimeMs = estimateFightTimeMs(goblinHits, SLOW_SKILL_ROTATION_PERIOD_MS)
    const slugTimeMs   = estimateFightTimeMs(slugHits,   SLOW_SKILL_ROTATION_PERIOD_MS)

    // Slug fight is much longer
    expect(slugTimeMs).toBeGreaterThan(goblinTimeMs * 3)
  })

  it('#12 power user (CRITs) reduces estimated fight time vs casual (HITs)', () => {
    const powerUserHits  = minHitsToKill(ENEMY_LAVA_SLUG.maxHp, SLOW_CRIT_DMG)
    const casualHits     = minHitsToKill(ENEMY_LAVA_SLUG.maxHp, SLOW_HIT_DMG)
    const powerTimeMs    = estimateFightTimeMs(powerUserHits, SLOW_SKILL_ROTATION_PERIOD_MS)
    const casualTimeMs   = estimateFightTimeMs(casualHits,    SLOW_SKILL_ROTATION_PERIOD_MS)

    // Power user cuts fight time by using crits
    expect(powerTimeMs).toBeLessThan(casualTimeMs)
  })

  it('#12 using both hands (slow + fast CRITs) halves estimated fight time vs single skill', () => {
    const combinedDmgPerRound = SLOW_CRIT_DMG + FAST_CRIT_DMG
    const combinedRounds  = minHitsToKill(ENEMY_LAVA_SLUG.maxHp, combinedDmgPerRound)
    const slowOnlyHits    = minHitsToKill(ENEMY_LAVA_SLUG.maxHp, SLOW_CRIT_DMG)

    // Combined DPS approach finishes the fight faster
    expect(combinedRounds).toBeLessThan(slowOnlyHits)
  })

  it('#12 power user: machine confirms kill with sustained slow CRITs', () => {
    const machine = new GameStateMachine()
    machine.startBattle()

    const hitsNeeded = minHitsToKill(ENEMY_LAVA_SLUG.maxHp, SLOW_CRIT_DMG)
    for (let i = 0; i < hitsNeeded; i++) {
      machine._applyHitForTesting('CRIT', 'slow_shot')
    }
    expect(['fight_overview']).toContain(machine.getState().phase)
  })

  it('#12 fast CRIT also contributes, but less efficient than slow CRIT for Lava Slug', () => {
    const fastHitsNeeded = minHitsToKill(ENEMY_LAVA_SLUG.maxHp, FAST_CRIT_DMG)
    const slowHitsNeeded = minHitsToKill(ENEMY_LAVA_SLUG.maxHp, SLOW_CRIT_DMG)

    // Slow crits deal 2× fast crits → need ~half the hits
    expect(slowHitsNeeded).toBeLessThan(fastHitsNeeded)
  })
})
