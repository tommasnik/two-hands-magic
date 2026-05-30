// ============================================================
// StatusEffectSystem — open/extensible enemy status effect management
// Pure TypeScript, no Phaser dependency.
//
// Design principle (OCP):
//   Adding a new status = new StatusEffect definition + InteractionRule
//   in the skill module. Zero changes to this system or GameStateMachine.
// ============================================================

import type { StatusEffect, EnemyStateSlice } from '../skills/types'

/**
 * Manages active status effects on an enemy.
 *
 * Responsibilities:
 *   apply()    — Add or refresh a status effect on an enemy.
 *   tick()     — Advance timers and remove expired effects.
 *   isActive() — Check whether a given kind is currently active.
 *
 * The system operates on the `activeStatusEffects` array inside an
 * EnemyStateSlice — it does NOT own the array; callers own the state object.
 */
export class StatusEffectSystem {
  /**
   * Apply a status effect to an enemy.
   *
   * Reset semantics:
   *   If the enemy already has a status of the same kind, the new effect
   *   replaces it entirely (both duration and properties). Effects do NOT
   *   stack additively. Each new application resets the timer to the new
   *   duration — this is the canonical game behaviour (see TASK-61 AC #7).
   *
   * @param enemy  - enemy state slice (mutated in place)
   * @param effect - status effect to apply
   */
  apply(enemy: EnemyStateSlice, effect: StatusEffect): void {
    const idx = enemy.activeStatusEffects.findIndex(e => e.kind === effect.kind)
    if (idx >= 0) {
      // Replace existing effect with the new one (reset timer and properties)
      enemy.activeStatusEffects[idx] = { ...effect }
    } else {
      enemy.activeStatusEffects.push({ ...effect })
    }
  }

  /**
   * Advance all active status timers by dt milliseconds.
   * Removes effects whose remainingMs has reached 0 or below.
   *
   * @param dtMs   - frame delta in ms
   * @param enemy  - enemy state slice (mutated in place)
   */
  tick(dtMs: number, enemy: EnemyStateSlice): void {
    for (let i = enemy.activeStatusEffects.length - 1; i >= 0; i--) {
      // Non-null assertion safe: we iterate by valid index
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      enemy.activeStatusEffects[i]!.remainingMs -= dtMs
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (enemy.activeStatusEffects[i]!.remainingMs <= 0) {
        enemy.activeStatusEffects.splice(i, 1)
      }
    }
  }

  /**
   * Check whether a status effect of the given kind is currently active.
   *
   * @param enemy - enemy state slice
   * @param kind  - status kind to check (e.g. 'frozen', 'burning')
   * @returns true if an active (remainingMs > 0) effect of that kind exists
   */
  isActive(enemy: EnemyStateSlice, kind: string): boolean {
    return enemy.activeStatusEffects.some(e => e.kind === kind && e.remainingMs > 0)
  }
}
