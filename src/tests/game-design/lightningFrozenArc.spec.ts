// ============================================================
// Game Design Spec — Lightning + Frozen arc DoT (TASK-76)
//
// When lightning_blast hits a frozen enemy, a 'lightning_arc' DoT status is
// applied that ticks every LIGHTNING_ARC_TICK_INTERVAL_MS for the duration of
// the freeze. This spec verifies:
//   - Power user: CRIT freeze + lightning → expected total arc DoT damage
//   - Casual player: HIT freeze + lightning → at least 3 ticks fire
//   - Edge case: DoT stops when freeze expires (no ticks after freeze window)
// ============================================================

import { describe, it, expect } from 'vitest'
import { GameStateMachine } from '../../game/GameStateMachine'
import {
  ICE_CRYSTAL_FREEZE_CRIT_MS,
  ICE_CRYSTAL_FREEZE_HIT_MS,
  LIGHTNING_ARC_TICK_INTERVAL_MS,
  LIGHTNING_ARC_TICK_DAMAGE_RATIO,
  LIGHTNING_BLAST_DAMAGE_MIN,
  LIGHTNING_BLAST_DAMAGE_MAX,
  MAX_DELTA_MS,
} from '../../game/constants'

const LIGHTNING_ARC_TICK_DAMAGE = Math.round(
  ((LIGHTNING_BLAST_DAMAGE_MIN + LIGHTNING_BLAST_DAMAGE_MAX) / 2) * LIGHTNING_ARC_TICK_DAMAGE_RATIO,
)

/** Advance gsm by ms milliseconds in MAX_DELTA_MS steps, return all emitted events. */
function advanceMs(gsm: GameStateMachine, ms: number) {
  const events = []
  for (let t = 0; t < ms; t += MAX_DELTA_MS) {
    events.push(...gsm.update(MAX_DELTA_MS, []))
  }
  return events
}

describe('Game Design — lightning + frozen arc DoT interaction', () => {
  // ---------------------------------------------------------------------------
  // Power user: CRIT freeze → full arc DoT window
  // Expected: floor(ICE_CRYSTAL_FREEZE_CRIT_MS / TICK_INTERVAL) ticks of damage
  // ---------------------------------------------------------------------------
  it('power user — CRIT freeze + lightning fires expected number of arc ticks', () => {
    const gsm = new GameStateMachine()
    gsm.startBattle()

    // Freeze enemy with CRIT (2000ms freeze)
    gsm._applyHitForTesting('CRIT', 'ice_crystal')
    const hpAfterFreeze = gsm.getState().fight.enemyHp

    // Lightning hits frozen enemy → arc DoT starts
    gsm._applyHitForTesting('HIT', 'lightning_blast')
    const hpAfterLightning = gsm.getState().fight.enemyHp

    // Advance through the full freeze window
    advanceMs(gsm, ICE_CRYSTAL_FREEZE_CRIT_MS)
    const hpAfterFullDoT = gsm.getState().fight.enemyHp

    const expectedTicks = Math.floor(ICE_CRYSTAL_FREEZE_CRIT_MS / LIGHTNING_ARC_TICK_INTERVAL_MS)
    const expectedArcDamage = expectedTicks * LIGHTNING_ARC_TICK_DAMAGE

    // Initial lightning hit dealt some direct damage (separate from arc DoT)
    expect(hpAfterLightning).toBeLessThan(hpAfterFreeze)

    // Total arc DoT damage matches expected
    const actualArcDamage = hpAfterLightning - hpAfterFullDoT
    expect(actualArcDamage).toBe(expectedArcDamage)
  })

  // ---------------------------------------------------------------------------
  // Casual player: HIT freeze → at least 3 arc ticks fire
  // ---------------------------------------------------------------------------
  it('casual player — HIT freeze + lightning triggers at least 3 arc ticks', () => {
    const gsm = new GameStateMachine()
    gsm.startBattle()

    gsm._applyHitForTesting('HIT', 'ice_crystal')
    gsm._applyHitForTesting('HIT', 'lightning_blast')
    const hpAfterLightning = gsm.getState().fight.enemyHp

    // Advance 3 tick intervals
    advanceMs(gsm, LIGHTNING_ARC_TICK_INTERVAL_MS * 3)
    const hpAfter3Ticks = gsm.getState().fight.enemyHp

    // At least 3 ticks of damage should have occurred
    const damageFrom3Ticks = hpAfterLightning - hpAfter3Ticks
    expect(damageFrom3Ticks).toBeGreaterThanOrEqual(3 * LIGHTNING_ARC_TICK_DAMAGE)
  })

  // ---------------------------------------------------------------------------
  // Edge case: freeze expires → DoT stops (no HP drain after freeze window)
  // ---------------------------------------------------------------------------
  it('edge case — DoT stops exactly when freeze expires', () => {
    const gsm = new GameStateMachine()
    gsm.startBattle()

    gsm._applyHitForTesting('HIT', 'ice_crystal')
    gsm._applyHitForTesting('HIT', 'lightning_blast')

    // Advance past the full freeze window
    advanceMs(gsm, ICE_CRYSTAL_FREEZE_HIT_MS + 50)
    const hpAtFreezeEnd = gsm.getState().fight.enemyHp

    // Advance well beyond the freeze window — no more arc damage
    advanceMs(gsm, 1000)
    const hpAfterLong = gsm.getState().fight.enemyHp

    expect(hpAfterLong).toBe(hpAtFreezeEnd)
  })

  // ---------------------------------------------------------------------------
  // Edge case: no arc DoT on unfrozen enemy
  // ---------------------------------------------------------------------------
  it('edge case — lightning alone deals no DoT (no frozen status)', () => {
    const gsm = new GameStateMachine()
    gsm.startBattle()

    gsm._applyHitForTesting('HIT', 'lightning_blast')
    const hpAfterLightning = gsm.getState().fight.enemyHp

    advanceMs(gsm, LIGHTNING_ARC_TICK_INTERVAL_MS * 5)
    expect(gsm.getState().fight.enemyHp).toBe(hpAfterLightning)
  })
})
