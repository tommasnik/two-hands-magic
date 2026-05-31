// ============================================================
// GlobalState — encapsulates all run-level (cross-fight) data.
//
// Held by GameStateMachine as `private _global: GlobalState`.
// Fight-local data lives in FightState — never here.
// ============================================================

import type { Phase } from '../../types'
import { PlayerProgression } from './PlayerProgression'

/**
 * Run-level state that persists across fights.
 *
 * Owns:
 *   - phase          — current high-level game phase
 *   - currentLevel   — 1-based index into ENEMY_POOL
 *   - progression    — XP, player level, upgrade tree
 */
export class GlobalState {
  phase: Phase
  currentLevel: number
  progression: PlayerProgression

  constructor(startPhase: Phase = 'loading', startLevel = 1) {
    this.phase = startPhase
    this.currentLevel = startLevel
    this.progression = new PlayerProgression()
  }
}
