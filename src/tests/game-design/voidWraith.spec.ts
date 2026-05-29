// ============================================================
// Game Design Spec — Void Wraith
//
// Large, semi-transparent enemy with a very small crit zone.
// The body is easy to see and hit, but the "core" crit window
// is tiny — requiring precise timing to land crits.
//
// Design intent:
//   - Large body → easy to hit (high hitZone)
//   - Tiny crit zone → hard to crit (very small critZone)
//   - Power user: waits for the right timing, crits → efficient
//   - Casual player: lands HITs easily but rarely crits → slower kill
// ============================================================

import { describe, it, expect } from 'vitest'
import { GameStateMachine } from '../../game/GameStateMachine'
import {
  SLOW_SKILL_DAMAGE,
  CRIT_DAMAGE_MULTIPLIER,
  HIT_DAMAGE_MULTIPLIER,
  ENEMY_VOID_WRAITH,
} from '../../game/constants'

const SLOW_CRIT_DMG = SLOW_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const SLOW_HIT_DMG  = SLOW_SKILL_DAMAGE * HIT_DAMAGE_MULTIPLIER

function minHitsToKill(maxHp: number, dmgPerHit: number): number {
  return Math.ceil(maxHp / dmgPerHit)
}

describe('Game Design: Void Wraith — large body, tiny crit window', () => {
  it('#15 Void Wraith has a very small crit zone (tiny core within large body)', () => {
    expect(ENEMY_VOID_WRAITH.critZone).toBeDefined()
    expect(ENEMY_VOID_WRAITH.critZone!).toBeLessThan(0.15)
  })

  it('#15 Void Wraith hit zone is large (easy to hit, hard to crit)', () => {
    expect(ENEMY_VOID_WRAITH.hitZone).toBeDefined()
    expect(ENEMY_VOID_WRAITH.hitZone!).toBeGreaterThan(0.7)
  })

  it('#15 critZoneScale is very small despite the large body', () => {
    expect(ENEMY_VOID_WRAITH.critZoneScale).toBeLessThan(0.5)
  })

  it('#15 power user (CRITs) kills Void Wraith in fewer shots than casual (HITs)', () => {
    const powerHits  = minHitsToKill(ENEMY_VOID_WRAITH.maxHp, SLOW_CRIT_DMG)
    const casualHits = minHitsToKill(ENEMY_VOID_WRAITH.maxHp, SLOW_HIT_DMG)
    expect(powerHits).toBeLessThan(casualHits)
  })

  it('#15 HIT-only path (casual) needs more shots than CRIT path', () => {
    const powerHits  = minHitsToKill(ENEMY_VOID_WRAITH.maxHp, SLOW_CRIT_DMG)
    const casualHits = minHitsToKill(ENEMY_VOID_WRAITH.maxHp, SLOW_HIT_DMG)
    // CRITs deal 2× → casual needs approximately 2× the shots.
    // Due to Math.ceil rounding effects, exact 2× is not guaranteed on all HP values.
    // Design intent: casual needs strictly more shots — confirmed by > assertion.
    expect(casualHits).toBeGreaterThan(powerHits)
    // And at least 1.5× to confirm meaningful gap (not rounding noise)
    expect(casualHits).toBeGreaterThanOrEqual(Math.floor(powerHits * 1.5))
  })

  it('#15 Void Wraith size is huge', () => {
    expect(ENEMY_VOID_WRAITH.size).toBe('huge')
  })

  it('#15 strafe movement shifts the tiny crit window', () => {
    expect(ENEMY_VOID_WRAITH.movementPattern).toBe('strafe')
  })

  it('#15 power user: machine confirms kill with slow CRITs', () => {
    const machine = new GameStateMachine()
    machine.startBattle()

    const hitsNeeded = minHitsToKill(ENEMY_VOID_WRAITH.maxHp, SLOW_CRIT_DMG)
    for (let i = 0; i < hitsNeeded; i++) {
      machine._applyHitForTesting('CRIT', 'slow_shot')
    }
    expect(['fight_overview']).toContain(machine.getState().phase)
  })

  it('#15 casual: machine confirms kill with slow HITs (more shots but viable)', () => {
    const machine = new GameStateMachine()
    machine.startBattle()

    const hitsNeeded = minHitsToKill(ENEMY_VOID_WRAITH.maxHp, SLOW_HIT_DMG)
    for (let i = 0; i < hitsNeeded; i++) {
      machine._applyHitForTesting('HIT', 'slow_shot')
    }
    expect(['fight_overview']).toContain(machine.getState().phase)
  })

  it('#15 Void Wraith HP is substantial — not a quick fight even for power user', () => {
    const hitsNeeded = minHitsToKill(ENEMY_VOID_WRAITH.maxHp, SLOW_CRIT_DMG)
    expect(hitsNeeded).toBeGreaterThan(2) // requires sustained attention
  })
})
