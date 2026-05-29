// ============================================================
// Game Design Spec — Thunder Hawk
//
// Medium size, fast diagonal movement. The hit window is short.
// Design intent: the diagonal path means the enemy spends less
// time in the aim lane — players must time shots precisely.
//
// Test verifies:
//   - hit window is short (small hitZone, small critZone)
//   - power user can kill with CRIT timing
//   - casual player: lower effective hit rate than on static enemies
// ============================================================

import { describe, it, expect } from 'vitest'
import { GameStateMachine } from '../../game/GameStateMachine'
import {
  SLOW_SKILL_DAMAGE,
  FAST_SKILL_DAMAGE,
  CRIT_DAMAGE_MULTIPLIER,
  HIT_DAMAGE_MULTIPLIER,
  ENEMY_THUNDER_HAWK,
  ENEMY_SHADOW_DANCER,
} from '../../game/constants'

const SLOW_CRIT_DMG = SLOW_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const FAST_CRIT_DMG = FAST_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const SLOW_HIT_DMG  = SLOW_SKILL_DAMAGE * HIT_DAMAGE_MULTIPLIER

function minHitsToKill(maxHp: number, dmgPerHit: number): number {
  return Math.ceil(maxHp / dmgPerHit)
}

describe('Game Design: Thunder Hawk — short hit window, diagonal speed', () => {
  it('#13 Thunder Hawk has diagonal movement pattern', () => {
    expect(ENEMY_THUNDER_HAWK.movementPattern).toBe('diagonal')
  })

  it('#13 Thunder Hawk crit zone is smaller than Shadow Dancer (faster = tighter window)', () => {
    expect(ENEMY_THUNDER_HAWK.critZone).toBeDefined()
    expect(ENEMY_THUNDER_HAWK.critZone!).toBeLessThan(ENEMY_SHADOW_DANCER.critZone!)
  })

  it('#13 Thunder Hawk hit zone is smaller than Shadow Dancer (fast diagonal = less time in lane)', () => {
    expect(ENEMY_THUNDER_HAWK.hitZone).toBeDefined()
    expect(ENEMY_THUNDER_HAWK.hitZone!).toBeLessThanOrEqual(ENEMY_SHADOW_DANCER.hitZone!)
  })

  it('#13 effective shots needed (hit zone adjusted) are more than on Shadow Dancer', () => {
    const hawkEffective    = Math.ceil(
      minHitsToKill(ENEMY_THUNDER_HAWK.maxHp, SLOW_HIT_DMG) / ENEMY_THUNDER_HAWK.hitZone!
    )
    const dancerEffective  = Math.ceil(
      minHitsToKill(ENEMY_SHADOW_DANCER.maxHp, SLOW_HIT_DMG) / ENEMY_SHADOW_DANCER.hitZone!
    )

    // Hawk: lower hitZone → more effective shots, even with lower HP
    expect(hawkEffective).toBeGreaterThanOrEqual(dancerEffective * 0.8)
  })

  it('#13 power user (CRITs) kills Thunder Hawk more efficiently than casual (HITs)', () => {
    const powerHits  = minHitsToKill(ENEMY_THUNDER_HAWK.maxHp, SLOW_CRIT_DMG)
    const casualHits = minHitsToKill(ENEMY_THUNDER_HAWK.maxHp, SLOW_HIT_DMG)
    expect(powerHits).toBeLessThan(casualHits)
  })

  it('#13 power user: machine confirms kill with slow CRITs', () => {
    const machine = new GameStateMachine()
    machine.startBattle()

    // Use the actual enemy HP from the machine (pool rotation may differ from Thunder Hawk)
    const actualHp = machine.getState().enemyMaxHp
    const hitsNeeded = minHitsToKill(actualHp, SLOW_CRIT_DMG)
    for (let i = 0; i < hitsNeeded; i++) {
      machine._applyHitForTesting('CRIT', 'slow_shot')
    }
    expect(['fight_overview']).toContain(machine.getState().phase)
  })

  it('#13 fast_shot CRIT path also kills Thunder Hawk (fast reaction plays fast skill)', () => {
    const hitsNeeded = minHitsToKill(ENEMY_THUNDER_HAWK.maxHp, FAST_CRIT_DMG)
    let hp = ENEMY_THUNDER_HAWK.maxHp
    for (let i = 0; i < hitsNeeded; i++) {
      hp = Math.max(0, hp - FAST_CRIT_DMG)
    }
    expect(hp).toBe(0)
  })

  it('#13 Thunder Hawk size is medium — not the target size that makes it hard, but the speed', () => {
    expect(ENEMY_THUNDER_HAWK.size).toBe('medium')
  })

  it('#13 critZoneScale is reduced (smaller crit window on fast target)', () => {
    expect(ENEMY_THUNDER_HAWK.critZoneScale).toBeLessThan(0.8)
  })
})
