// ============================================================
// BehaviorSystem — pure TypeScript, no Phaser dependency
//
// Computes enemy position each game tick based on an EnemyBehaviorDef.
// All patterns are deterministic: the same (originX, originY, elapsedMs)
// inputs always produce the same (x, y) output.
//
// Extensibility notes:
//   - Add new MovementPattern values to types/index.ts and handle them
//     in computePosition() — no structural changes needed elsewhere.
//   - EnemyBehaviorDef is designed to accept future fields (e.g.
//     shootingPattern, reactionToPlayer) without breaking existing defs.
//   - BehaviorSystem is intentionally stateless — the caller (GameStateMachine)
//     owns all mutable state (enemy x/y, elapsedMs).
// ============================================================

import type { EnemyBehaviorDef, MovementPattern } from '../../types'
import { GAME_WIDTH, GAME_HEIGHT, ENEMY_DEFAULT_Y } from '../constants'

/**
 * Computed position output from BehaviorSystem.
 * The caller should write these values to the enemy entity.
 */
export interface EnemyPosition {
  /** Horizontal position in logical canvas space. Unit: px. */
  x: number
  /** Vertical position in logical canvas space. Unit: px. */
  y: number
}

// ============================================================
// Pattern implementations — each is a pure function with
// signature: (originX, originY, elapsedMs, behavior) → position
// ============================================================

/**
 * Static pattern — enemy does not move.
 * Returns the origin position unchanged.
 */
function computeStatic(originX: number, originY: number): EnemyPosition {
  return { x: originX, y: originY }
}

/**
 * LR oscillate pattern — smooth left-right cosine oscillation.
 * Uses cosine so the enemy starts at originX and sweeps outward.
 *
 * Formula: x = originX + amplitude × cos(2π × elapsedMs / periodMs)
 *
 * Period is derived from amplitude and speed:
 *   periodMs = (2 × amplitude / speed) × 1000
 *
 * @param originX   - Horizontal centre of the sweep (enemy's base X). Unit: px.
 * @param originY   - Vertical position (unchanged). Unit: px.
 * @param elapsedMs - Elapsed battle time. Unit: ms.
 * @param behavior  - EnemyBehaviorDef with pattern='lr_oscillate', speed, amplitude.
 */
function computeLrOscillate(
  originX: number,
  originY: number,
  elapsedMs: number,
  behavior: EnemyBehaviorDef,
): EnemyPosition {
  const amplitude = behavior.amplitude ?? GAME_WIDTH * 0.25
  // Avoid division by zero for degenerate configs
  if (behavior.speed <= 0 || amplitude <= 0) return { x: originX, y: originY }
  // Period: time to complete one full left-right-left cycle
  const periodMs = (2 * amplitude / behavior.speed) * 1000
  const phase = (2 * Math.PI * elapsedMs) / periodMs
  return {
    x: originX + amplitude * Math.cos(phase),
    y: originY,
  }
}

/**
 * Zigzag pattern — moves horizontally at constant speed, reversing direction
 * sharply when it reaches the amplitude boundary.
 *
 * Uses a triangle wave for the x offset:
 *   normalised position in [0, 1] → triangle value in [-1, 1]
 *
 * Period is derived from amplitude and speed:
 *   periodMs = (2 × amplitude / speed) × 1000
 *
 * @param originX   - Horizontal centre of the zigzag sweep. Unit: px.
 * @param originY   - Vertical position (unchanged). Unit: px.
 * @param elapsedMs - Elapsed battle time. Unit: ms.
 * @param behavior  - EnemyBehaviorDef with pattern='zigzag', speed, amplitude.
 */
function computeZigzag(
  originX: number,
  originY: number,
  elapsedMs: number,
  behavior: EnemyBehaviorDef,
): EnemyPosition {
  const amplitude = behavior.amplitude ?? GAME_WIDTH * 0.2
  if (behavior.speed <= 0 || amplitude <= 0) return { x: originX, y: originY }
  const periodMs = (2 * amplitude / behavior.speed) * 1000
  // Normalised position in [0, 1)
  const t = (elapsedMs % periodMs) / periodMs
  // Triangle wave: rises from -1→1 in first half, falls 1→-1 in second half
  const triangle = t < 0.5 ? 4 * t - 1 : 3 - 4 * t
  return {
    x: originX + amplitude * triangle,
    y: originY,
  }
}

/**
 * Diagonal pattern — moves diagonally at constant speed, bouncing off the
 * horizontal canvas bounds.
 *
 * The enemy moves at `speed` px/s in a direction vector (1, 0.4) (normalized).
 * On hitting the left/right canvas margin it reflects horizontally.
 * Vertical position oscillates gently — adds visual dynamism to the diagonal path.
 *
 * @param originX   - Starting horizontal position. Unit: px.
 * @param originY   - Starting vertical position. Unit: px.
 * @param elapsedMs - Elapsed battle time. Unit: ms.
 * @param behavior  - EnemyBehaviorDef with pattern='diagonal', speed.
 */
function computeDiagonal(
  originX: number,
  originY: number,
  elapsedMs: number,
  behavior: EnemyBehaviorDef,
): EnemyPosition {
  if (behavior.speed <= 0) return { x: originX, y: originY }

  // Horizontal travel: bounces between left margin and right margin
  const margin = GAME_WIDTH * 0.1
  const bounceWidth = GAME_WIDTH - 2 * margin
  /* c8 ignore next — defensive guard; bounceWidth > 0 for all valid GAME_WIDTH values */
  if (bounceWidth <= 0) return { x: originX, y: originY }

  // Time for one full horizontal bounce cycle (left → right → left)
  const hPeriodMs = (2 * bounceWidth / behavior.speed) * 1000
  const hT = (elapsedMs % hPeriodMs) / hPeriodMs
  // Triangle wave for horizontal bounce
  const hTriangle = hT < 0.5 ? 4 * hT - 1 : 3 - 4 * hT
  const x = margin + bounceWidth / 2 + (bounceWidth / 2) * hTriangle

  // Vertical: gentle secondary oscillation at half the horizontal speed
  const vAmplitude = GAME_HEIGHT * 0.04
  const vPeriodMs = hPeriodMs * 0.7
  const vPhase = (2 * Math.PI * elapsedMs) / vPeriodMs
  const y = originY + vAmplitude * Math.sin(vPhase)

  return { x, y }
}

/**
 * Approach pattern — enemy moves steadily downward (toward the player).
 * Creates urgency: kill it before it reaches the player's zone.
 *
 * The enemy moves at `speed` px/s downward from its originY.
 * Position is clamped so it cannot move above originY or below a lower bound.
 *
 * @param originX   - Horizontal position (unchanged). Unit: px.
 * @param originY   - Starting vertical position. Unit: px.
 * @param elapsedMs - Elapsed battle time. Unit: ms.
 * @param behavior  - EnemyBehaviorDef with pattern='approach', speed.
 */
function computeApproach(
  originX: number,
  originY: number,
  elapsedMs: number,
  behavior: EnemyBehaviorDef,
): EnemyPosition {
  if (behavior.speed <= 0) return { x: originX, y: originY }
  // Maximum approach distance: from originY to 70% of canvas height
  const maxApproach = GAME_HEIGHT * 0.7 - ENEMY_DEFAULT_Y
  const travelled = (behavior.speed * elapsedMs) / 1000
  const y = originY + Math.min(travelled, Math.max(0, maxApproach))
  return { x: originX, y }
}

// ============================================================
// Public API
// ============================================================

/**
 * Pattern dispatch map — maps each MovementPattern to its pure compute function.
 * Extend this map when adding new patterns to the MovementPattern union.
 */
const PATTERN_DISPATCH: Record<
  MovementPattern,
  (originX: number, originY: number, elapsedMs: number, behavior: EnemyBehaviorDef) => EnemyPosition
> = {
  static:       (ox, oy) => computeStatic(ox, oy),
  lr_oscillate: (ox, oy, t, b) => computeLrOscillate(ox, oy, t, b),
  zigzag:       (ox, oy, t, b) => computeZigzag(ox, oy, t, b),
  diagonal:     (ox, oy, t, b) => computeDiagonal(ox, oy, t, b),
  approach:     (ox, oy, t, b) => computeApproach(ox, oy, t, b),
}

/**
 * Computes the enemy position for the current tick.
 *
 * Pure function — no side effects. The caller (GameStateMachine) is responsible
 * for writing the returned position to the enemy entity.
 *
 * @param originX   - The enemy's base/spawn X position. Unit: px.
 * @param originY   - The enemy's base/spawn Y position. Unit: px.
 * @param elapsedMs - Total elapsed battle time. Unit: ms.
 * @param behavior  - Behavior descriptor from the current level's EnemyDef.
 * @returns         - New x/y position for the enemy this tick. Unit: px.
 */
export function computeEnemyPosition(
  originX: number,
  originY: number,
  elapsedMs: number,
  behavior: EnemyBehaviorDef,
): EnemyPosition {
  const fn = PATTERN_DISPATCH[behavior.pattern]
  return fn(originX, originY, elapsedMs, behavior)
}
