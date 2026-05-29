// ============================================================
// Game Design Test Framework — types
// ============================================================

import type { InputEvent } from '../../types'

/**
 * A single step in a player's action sequence.
 *
 * - `injectInput`: queue a raw InputEvent into the game state machine
 * - `wait`: advance simulation time by the given number of milliseconds
 */
export type Action =
  | { type: 'injectInput'; payload: InputEvent }
  | { type: 'wait'; payload: { ms: number } }

/**
 * A single assertion checked after executing the action sequence.
 *
 * - `metric`:   key into the RunResult.metrics map
 * - `maxMs`:    pass if metric value <= maxMs  (time-based: milliseconds)
 * - `minMs`:    pass if metric value >= minMs  (time-based: milliseconds)
 * - `value`:    pass if metric value deeply equals this (for booleans etc.)
 * - `minValue`: pass if metric value >= minValue (count-based: shots, hits, etc.)
 * - `maxValue`: pass if metric value <= maxValue (count-based: shots, hits, etc.)
 */
export interface Assertion {
  metric: string
  maxMs?: number
  minMs?: number
  value?: unknown
  minValue?: number
  maxValue?: number
}

/**
 * A named player profile with a sequence of actions and expected outcomes.
 */
export interface PlayerProfile {
  description: string
  actions: Action[]
  assertions: Assertion[]
}

/**
 * Top-level spec describing expected behaviour for a power user and a casual player.
 */
export interface GameDesignSpec {
  name: string
  description: string
  powerUser: PlayerProfile
  casualPlayer: PlayerProfile
}
