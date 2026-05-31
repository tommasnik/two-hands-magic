// ============================================================
// PhaseManager — pure phase-transition state machine
// Pure TypeScript, no Phaser dependency.
//
// Responsibility: decide WHEN to transition between game phases.
//   - loading → battle: driven by startBattle()
//   - battle → fight_overview: enemy.hp <= 0
//   - battle → game_over: player.hp <= 0
//   - fight_overview → battle: nextLevel() / restartGame()
//   - game_over → battle: restartLevel()
//
// Does NOT own HP, does NOT apply damage. Just reads the current
// HP values and transitions the phase accordingly.
// ============================================================

import type { Phase } from '../../types'

/**
 * Minimal player snapshot PhaseManager reads to evaluate transitions.
 */
export interface PhasePlayerSnapshot {
  /** Current HP. Unit: HP. */
  hp: number
}

/**
 * Minimal enemy snapshot PhaseManager reads to evaluate transitions.
 */
export interface PhaseEnemySnapshot {
  /** Current HP. Unit: HP. */
  hp: number
}

/**
 * PhaseManager — single-responsibility state machine for game phase transitions.
 *
 * Evaluate: read hp values → decide if a transition is needed → set `_transitioned`.
 * The GSM checks `didTransition()` and reacts (e.g. snapshot fightStats, call _onEnemyKilled).
 *
 * All transition logic that was inline in _applyHit / _applyPlayerHit lives here.
 * GSM no longer has direct `if (hp <= 0)` checks — it delegates to this module.
 */
export class PhaseManager {
  private _phase: Phase
  private _transitioned = false

  constructor(initialPhase: Phase = 'loading') {
    this._phase = initialPhase
  }

  /** The current game phase. */
  get currentPhase(): Phase {
    return this._phase
  }

  /**
   * Evaluate whether the current HP values warrant a phase transition.
   *
   * Call after every damage application.
   *
   * Enemy-death (→ fight_overview) is only evaluated while in 'battle'.
   * Player-death (→ game_over) is evaluated from 'battle' or 'fight_overview'
   * because the delivery system can apply player damage in both phases via
   * the fire-and-forget model (deliveries in flight when enemy dies still connect).
   *
   * @param player - current player snapshot (only hp is read)
   * @param enemy  - current enemy snapshot (only hp is read)
   */
  evaluate(player: PhasePlayerSnapshot, enemy: PhaseEnemySnapshot): void {
    this._transitioned = false

    if (this._phase === 'battle') {
      if (enemy.hp <= 0) {
        this._phase = 'fight_overview'
        this._transitioned = true
        return
      }
      if (player.hp <= 0) {
        this._phase = 'game_over'
        this._transitioned = true
        return
      }
    } else if (this._phase === 'fight_overview') {
      // Deliveries already in flight when the enemy died can still connect.
      // Allow player death → game_over from fight_overview.
      if (player.hp <= 0) {
        this._phase = 'game_over'
        this._transitioned = true
      }
    }
  }

  /**
   * Returns true if evaluate() triggered a phase transition on the last call.
   * Consumed once per evaluate() cycle by GSM to react to transitions.
   */
  didTransition(): boolean {
    return this._transitioned
  }

  /**
   * Directly force a phase transition — used by GSM public API methods
   * (startBattle, nextLevel, restartLevel, restartGame) that manage phase
   * flow outside of the hp-based evaluate() path.
   *
   * @param phase - target phase
   */
  forceTransition(phase: Phase): void {
    this._phase = phase
    this._transitioned = false
  }
}
