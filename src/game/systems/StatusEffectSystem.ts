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
   * For DoT effects (tickDamage + tickIntervalMs set), fires onDotTick for each
   * tick interval that elapsed within dtMs.
   *
   * @param dtMs      - frame delta in ms
   * @param enemy     - enemy state slice (mutated in place)
   * @param onDotTick - optional callback invoked once per DoT tick; receives the
   *                    effect plus its (guaranteed-defined) per-tick damage
   */
  tick(dtMs: number, enemy: EnemyStateSlice, onDotTick?: (effect: StatusEffect, tickDamage: number) => void): void {
    for (const effect of enemy.activeStatusEffects) {
      // Capture how long the effect was alive this frame before decrement.
      const prevRemaining = effect.remainingMs
      effect.remainingMs -= dtMs

      const { tickDamage, tickIntervalMs } = effect
      if (onDotTick !== undefined && tickDamage !== undefined && tickIntervalMs !== undefined) {
        // Only count time while the effect was alive (not past its expiry) so a
        // DoT never ticks beyond the status's own lifetime.
        let accumulated = (effect.msSinceLastTick ?? 0) + Math.min(dtMs, prevRemaining)
        while (accumulated >= tickIntervalMs) {
          accumulated -= tickIntervalMs
          onDotTick(effect, tickDamage)
        }
        effect.msSinceLastTick = accumulated
      }
    }

    // Remove expired effects in place — keep the same array reference so callers
    // holding a slice onto this list (GameStateMachine) see the mutation.
    const survivors = enemy.activeStatusEffects.filter(e => e.remainingMs > 0)
    enemy.activeStatusEffects.length = 0
    enemy.activeStatusEffects.push(...survivors)
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
