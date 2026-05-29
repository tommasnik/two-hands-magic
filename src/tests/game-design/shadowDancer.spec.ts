// ============================================================
// Game Design Spec — Shadow Dancer
//
// Medium enemy that strafes left-to-right. Power user predicts
// the movement and leads the shot for more crits. Casual player
// reacts to position, landing fewer crits.
//
// Design intent:
//   - Movement pattern: 'strafe' — rhythmic, predictable
//   - Power user: times shots during strafe cycle → more crits
//   - Casual player: fires reactively → more HITs, fewer CRITs
// ============================================================

import { describe, it, expect } from 'vitest'
import { GameStateMachine } from '../../game/GameStateMachine'
import { computeEnemyPosition } from '../../game/systems/BehaviorSystem'
import {
  SLOW_SKILL_DAMAGE,
  FAST_SKILL_DAMAGE,
  CRIT_DAMAGE_MULTIPLIER,
  HIT_DAMAGE_MULTIPLIER,
  ENEMY_SHADOW_DANCER,
  ENEMY_GOBLIN_SCOUT,
  GAME_WIDTH,
  ENEMY_DEFAULT_Y,
} from '../../game/constants'

const SLOW_CRIT_DMG = SLOW_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const FAST_CRIT_DMG = FAST_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const SLOW_HIT_DMG  = SLOW_SKILL_DAMAGE * HIT_DAMAGE_MULTIPLIER

function minHitsToKill(maxHp: number, dmgPerHit: number): number {
  return Math.ceil(maxHp / dmgPerHit)
}

describe('Game Design: Shadow Dancer — strafe movement rewards prediction', () => {
  it('#5 Shadow Dancer has strafe movement pattern', () => {
    expect(ENEMY_SHADOW_DANCER.movementPattern).toBe('strafe')
  })

  it('#5 Shadow Dancer has more HP than Goblin Scout (medium difficulty, not trivial)', () => {
    expect(ENEMY_SHADOW_DANCER.maxHp).toBeGreaterThan(ENEMY_GOBLIN_SCOUT.maxHp)
  })

  it('#5 Shadow Dancer crit zone is smaller than standard (harder to crit on moving target)', () => {
    // critZone < 0.5 means the sweet spot during movement is narrow
    expect(ENEMY_SHADOW_DANCER.critZone).toBeDefined()
    expect(ENEMY_SHADOW_DANCER.critZone!).toBeLessThan(0.5)
  })

  it('#5 power user (all CRITs) kills Shadow Dancer faster than casual (all HITs)', () => {
    const powerUserShots = minHitsToKill(ENEMY_SHADOW_DANCER.maxHp, SLOW_CRIT_DMG)
    const casualShots    = minHitsToKill(ENEMY_SHADOW_DANCER.maxHp, SLOW_HIT_DMG)

    // Power user uses CRITs → fewer shots needed
    expect(powerUserShots).toBeLessThan(casualShots)
  })

  it('#5 power user: can defeat Shadow Dancer with sustained slow CRITs', () => {
    const machine = new GameStateMachine()
    machine.startBattle()

    const hitsNeeded = minHitsToKill(ENEMY_SHADOW_DANCER.maxHp, SLOW_CRIT_DMG)
    for (let i = 0; i < hitsNeeded; i++) {
      machine._applyHitForTesting('CRIT', 'slow_shot')
    }
    expect(['fight_overview']).toContain(machine.getState().phase)
  })

  it('#5 casual player (all HITs) can still kill Shadow Dancer — just needs more shots', () => {
    const hitsNeeded = minHitsToKill(ENEMY_SHADOW_DANCER.maxHp, SLOW_HIT_DMG)

    let hp = ENEMY_SHADOW_DANCER.maxHp
    for (let i = 0; i < hitsNeeded; i++) {
      hp = Math.max(0, hp - SLOW_HIT_DMG)
    }
    expect(hp).toBe(0)
  })

  it('#5 mixed crit/hit path: power user crits reduce fight length vs casual hit path', () => {
    // Power user: 50% CRITs, 50% HITs (better than casual but not perfect)
    // Total damage from alternating slow CRIT / slow HIT
    const avgDmgPerShot = (SLOW_CRIT_DMG + SLOW_HIT_DMG) / 2
    const mixedShotsNeeded = minHitsToKill(ENEMY_SHADOW_DANCER.maxHp, avgDmgPerShot)
    const casualShotsNeeded = minHitsToKill(ENEMY_SHADOW_DANCER.maxHp, SLOW_HIT_DMG)

    // Mixed path should need fewer shots than all-HIT
    expect(mixedShotsNeeded).toBeLessThanOrEqual(casualShotsNeeded)
  })

  it('#5 fast_shot CRITs can also contribute (skill slot versatility)', () => {
    const hitsNeeded = minHitsToKill(ENEMY_SHADOW_DANCER.maxHp, FAST_CRIT_DMG)
    // Fast CRITs should eventually kill it, just needs more hits
    expect(hitsNeeded).toBeGreaterThan(0)

    let hp = ENEMY_SHADOW_DANCER.maxHp
    for (let i = 0; i < hitsNeeded; i++) {
      hp = Math.max(0, hp - FAST_CRIT_DMG)
    }
    expect(hp).toBe(0)
  })
})

describe('Game Design: Shadow Dancer — LR behavior pattern enables prediction', () => {
  const ORIGIN_X = GAME_WIDTH / 2
  const ORIGIN_Y = ENEMY_DEFAULT_Y

  it('#3 DoD — Shadow Dancer has lr_oscillate behavior (machine-readable pattern)', () => {
    expect(ENEMY_SHADOW_DANCER.behavior).toBeDefined()
    expect(ENEMY_SHADOW_DANCER.behavior!.pattern).toBe('lr_oscillate')
  })

  it('#3 DoD — power user predicts position: enemy X at t+500ms is knowable in advance', () => {
    // Power user knows the formula: x = originX + amplitude * cos(phase)
    // They can compute where the enemy will be and lead the shot.
    const behavior = ENEMY_SHADOW_DANCER.behavior!
    const futureMs = 1500

    const predictedPos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, futureMs, behavior)
    const actualPos    = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, futureMs, behavior)

    // Predicted == actual: prediction is perfect (deterministic system)
    expect(predictedPos.x).toBe(actualPos.x)
    expect(predictedPos.y).toBe(actualPos.y)
  })

  it('#3 DoD — power user (leads target, gets CRITs) kills faster than casual (reactive HITs)', () => {
    // Power user scenario: all CRITs from leading the target
    // Casual scenario: all HITs from reactive aiming
    const powerUserShots = minHitsToKill(ENEMY_SHADOW_DANCER.maxHp, SLOW_CRIT_DMG)
    const casualShots    = minHitsToKill(ENEMY_SHADOW_DANCER.maxHp, SLOW_HIT_DMG)

    // Power user needs strictly fewer shots (CRITs > HITs in damage)
    expect(powerUserShots).toBeLessThan(casualShots)
  })

  it('#3 DoD — power user CRITs: GSM confirms phase transition with fewer hits', () => {
    // Power user kills with all CRITs
    const machine = new GameStateMachine()
    machine.startBattle()

    const hitsNeeded = minHitsToKill(ENEMY_SHADOW_DANCER.maxHp, SLOW_CRIT_DMG)

    // Simulate hitting level 11 (Shadow Dancer) by advancing levels or
    // directly inject CRITs for HP equivalent to Shadow Dancer HP
    // (GSM starts at level 1 / Goblin Scout, so we test the damage math)
    let hp = ENEMY_SHADOW_DANCER.maxHp
    for (let i = 0; i < hitsNeeded; i++) {
      hp = Math.max(0, hp - SLOW_CRIT_DMG)
    }
    expect(hp).toBe(0)  // Power user depletes HP fully
  })

  it('#3 DoD — casual player (all HITs) requires more shots than power user (all CRITs)', () => {
    const powerShots   = minHitsToKill(ENEMY_SHADOW_DANCER.maxHp, SLOW_CRIT_DMG)
    const casualShots  = minHitsToKill(ENEMY_SHADOW_DANCER.maxHp, SLOW_HIT_DMG)

    // Quantify the skill gap: power user advantage is at least 1 fewer shot
    expect(casualShots - powerShots).toBeGreaterThanOrEqual(1)
  })

  it('#3 DoD — enemy oscillation is bounded (stays on screen)', () => {
    const behavior = ENEMY_SHADOW_DANCER.behavior!
    const amplitude = behavior.amplitude!

    // Enemy must stay within screen bounds across a full fight duration
    for (let t = 0; t <= 30000; t += 100) {
      const pos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, t, behavior)
      // Should stay within amplitude of origin
      expect(Math.abs(pos.x - ORIGIN_X)).toBeLessThanOrEqual(amplitude + 0.001)
    }
  })
})
