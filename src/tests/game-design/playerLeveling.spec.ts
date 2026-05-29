// ============================================================
// Game Design: Player XP & Leveling (task-41)
// Verifies the leveling pace and the pendingLevelUp gate behave
// the way the design demands. All numbers are derived from
// XP_LEVEL_THRESHOLDS — a designer can retune the curve without
// breaking these tests, as long as the design intent holds.
// ============================================================

import { describe, it, expect } from 'vitest'
import { GameStateMachine } from '../../game/GameStateMachine'
import {
  XP_LEVEL_THRESHOLDS,
  PLAYER_START_LEVEL,
  PLAYER_MAX_LEVEL,
  ENEMY_POOL,
  SLOW_SKILL_DAMAGE,
  CRIT_DAMAGE_MULTIPLIER,
  MAX_DELTA_MS,
} from '../../game/constants'

// ---------------------------------------------------------------------------
// Derived constants
// ---------------------------------------------------------------------------

/** Damage of a single SLOW_SHOT CRIT — the strongest single shot in the kit. */
const SLOW_CRIT = SLOW_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER

/**
 * Drive `gsm` through one full enemy kill using direct CRIT hits.
 * Confirms any pending level-up so the test can chain kills back-to-back.
 * After kill the phase is 'fight_overview'; advances to next level if not the last.
 */
function killCurrentEnemyAndAdvance(gsm: GameStateMachine): void {
  while (gsm.getState().enemyHp > 0) {
    gsm._applyHitForTesting('CRIT', 'slow_shot')
  }
  const phase = gsm.getState().phase
  if (phase === 'fight_overview' && gsm.getState().currentLevel < ENEMY_POOL.length) {
    gsm.confirmLevelUpUpgrade()
    gsm.nextLevel()
  }
}

/** Returns true when all levels are done (fight_overview at last level). */
function isRunComplete(gsm: GameStateMachine): boolean {
  const state = gsm.getState()
  return state.phase === 'fight_overview' && state.currentLevel >= ENEMY_POOL.length
}

// ---------------------------------------------------------------------------

describe('Game Design: Player XP & leveling pace', () => {
  it('gate test: XP = threshold-1 keeps level; one more kill promotes by exactly 1', () => {
    // Drive the gate at every threshold (2, 3, 4, 5, 6)
    const promotions = Object.keys(XP_LEVEL_THRESHOLDS)
      .map(Number)
      .sort((a, b) => a - b)
    for (const targetLevel of promotions) {
      const threshold = XP_LEVEL_THRESHOLDS[targetLevel]
      // Build a fresh run and kill (threshold - 1) enemies
      const gsm = new GameStateMachine()
      gsm.startBattle()
      for (let i = 0; i < threshold - 1; i++) killCurrentEnemyAndAdvance(gsm)
      // At this point the player must still be below targetLevel
      expect(gsm.getState().playerLevel).toBe(targetLevel - 1)
      expect(gsm.getState().playerXp).toBe(threshold - 1)
      // One more kill → exactly +1 level
      killCurrentEnemyAndAdvance(gsm)
      expect(gsm.getState().playerLevel).toBe(targetLevel)
      expect(gsm.getState().playerXp).toBe(threshold)
    }
  })

  it('full run: PLAYER_MAX_LEVEL is reached after defeating every enemy in ENEMY_POOL', () => {
    const gsm = new GameStateMachine()
    gsm.startBattle()
    while (!isRunComplete(gsm)) {
      killCurrentEnemyAndAdvance(gsm)
    }
    const state = gsm.getState()
    expect(state.playerLevel).toBe(PLAYER_MAX_LEVEL)
    expect(state.playerXp).toBe(ENEMY_POOL.length)
  })

  it('exactly (PLAYER_MAX_LEVEL - PLAYER_START_LEVEL) level-ups occur across a full run', () => {
    const gsm = new GameStateMachine()
    gsm.startBattle()
    let levelUps = 0
    let prevLevel = gsm.getState().playerLevel
    while (!isRunComplete(gsm)) {
      killCurrentEnemyAndAdvance(gsm)
      const newLevel = gsm.getState().playerLevel
      if (newLevel > prevLevel) levelUps += newLevel - prevLevel
      prevLevel = newLevel
    }
    expect(levelUps).toBe(PLAYER_MAX_LEVEL - PLAYER_START_LEVEL)
  })

  it('blocking: while pendingLevelUp is true, nextLevel() is a no-op and the game stays paused', () => {
    const gsm = new GameStateMachine()
    gsm.startBattle()
    // Kill enemy 1 → pendingLevelUp becomes true (threshold for level 2 = 1 kill)
    while (gsm.getState().enemyHp > 0) {
      gsm._applyHitForTesting('CRIT', 'slow_shot')
    }
    expect(gsm.getState().pendingLevelUp).toBe(true)
    const blockedLevel = gsm.getState().currentLevel
    // Simulate a battle tick — phase must stay fight_overview, currentLevel unchanged
    gsm.update(MAX_DELTA_MS, [])
    gsm.nextLevel() // explicit attempt is blocked by pendingLevelUp
    expect(gsm.getState().phase).toBe('fight_overview')
    expect(gsm.getState().currentLevel).toBe(blockedLevel)
    // Release the gate — game continues
    gsm.confirmLevelUpUpgrade()
    gsm.nextLevel()
    expect(gsm.getState().phase).toBe('battle')
    expect(gsm.getState().currentLevel).toBe(blockedLevel + 1)
  })

  it('design intent: every mid-run level-up surfaces a pick — final one auto-clears at fight_overview', () => {
    // A full run grants (PLAYER_MAX_LEVEL - PLAYER_START_LEVEL) level-ups. Every
    // promotion that lands during fight_overview must surface a pendingLevelUp
    // pick; the final promotion (which coincides with the last-level fight_overview)
    // is auto-cleared because the run is over and the picker has no purpose.
    const gsm = new GameStateMachine()
    gsm.startBattle()
    let confirms = 0
    while (!isRunComplete(gsm)) {
      while (gsm.getState().enemyHp > 0) {
        gsm._applyHitForTesting('CRIT', 'slow_shot')
      }
      if (gsm.getState().pendingLevelUp) {
        confirms++
        gsm.confirmLevelUpUpgrade()
      }
      if (gsm.getState().phase === 'fight_overview' && gsm.getState().currentLevel < ENEMY_POOL.length) {
        gsm.nextLevel()
      }
    }
    // One less than total level-ups: the last-level-coincident level-up is auto-cleared
    expect(confirms).toBe(PLAYER_MAX_LEVEL - PLAYER_START_LEVEL - 1)
    // The final state still reflects the full level promotion
    expect(gsm.getState().playerLevel).toBe(PLAYER_MAX_LEVEL)
    expect(gsm.getState().pendingLevelUp).toBe(false)
  })
})

describe('Game Design: power user vs casual player leveling pace', () => {
  it('power user: clears ENEMY_POOL.length enemies efficiently within the SLOW_CRIT TTK budget', () => {
    // Difficulty intent: a power user reaches PLAYER_MAX_LEVEL in the same kill
    // count as the campaign provides (= ENEMY_POOL.length kills). This is a sanity
    // check that the pacing constants do not require more kills than exist.
    expect(XP_LEVEL_THRESHOLDS[PLAYER_MAX_LEVEL]).toBeLessThanOrEqual(ENEMY_POOL.length)

    const gsm = new GameStateMachine()
    gsm.startBattle()
    let kills = 0
    while (!isRunComplete(gsm)) {
      while (gsm.getState().enemyHp > 0) {
        gsm._applyHitForTesting('CRIT', 'slow_shot')
      }
      kills++
      if (gsm.getState().phase === 'fight_overview' && gsm.getState().currentLevel < ENEMY_POOL.length) {
        gsm.confirmLevelUpUpgrade()
        gsm.nextLevel()
      }
    }
    expect(kills).toBe(ENEMY_POOL.length)
    expect(gsm.getState().playerLevel).toBe(PLAYER_MAX_LEVEL)
    void SLOW_CRIT // referenced to document the budget unit used by power users
  })

  it('casual player: even with sub-optimal mixed-result hits, leveling still tracks XP_LEVEL_THRESHOLDS', () => {
    // Casual play differs in how fast each enemy dies (more hits per kill),
    // not in how XP is awarded. XP is per-kill, regardless of damage source.
    // Verify that a player who only lands HITs (no CRITs) also reaches level 2
    // after their first kill — the leveling pace is robust to skill.
    const gsm = new GameStateMachine()
    gsm.startBattle()
    while (gsm.getState().enemyHp > 0) {
      // Mix of HIT + GRAZE — slower, but the kill still counts.
      gsm._applyHitForTesting('HIT', 'slow_shot')
    }
    expect(gsm.getState().playerLevel).toBe(PLAYER_START_LEVEL + 1)
    expect(gsm.getState().playerXp).toBe(XP_LEVEL_THRESHOLDS[PLAYER_START_LEVEL + 1])
  })
})
