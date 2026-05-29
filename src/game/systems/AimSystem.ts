import { AIM_GAIN, GAME_WIDTH, LASER_ORIGIN_Y } from '../constants'
import type { TouchPoint } from '../../types'

export interface ReticlePosition {
  x: number
  y: number
}

/**
 * Compute reticle position for a given touch point at elapsed time.
 *
 * Vertical sweep: the reticle travels from LASER_ORIGIN_Y (level of highest slot
 * in a full 6-button layout) to y=0 (top) linearly over one rotationPeriodMs, then
 * repeats. Phase 0 → horizontal aim at LASER_ORIGIN_Y; phase 1 → top of screen.
 * The reticle is never below LASER_ORIGIN_Y — aim always goes up, never down.
 *
 * Horizontal correction: screen centre + dragOffsetX * AIM_GAIN, clamped to [0, GAME_WIDTH].
 *
 * @param touchPoint    - which touch point is active (carries rotationPeriodMs)
 * @param dragOffsetX   - horizontal drag in pixels since touch down
 * @param elapsedMs     - time elapsed since touch down, in ms
 */
export function computeReticle(touchPoint: TouchPoint, dragOffsetX: number, elapsedMs: number): ReticlePosition {
  const { rotationPeriodMs } = touchPoint

  // Phase within current cycle: 0 = start (bottom), approaches 1 (top) over one period.
  const phase = (elapsedMs % rotationPeriodMs) / rotationPeriodMs

  // Vertical: LASER_ORIGIN_Y at phase 0 (horizontal aim), 0 at phase 1 (top).
  const y = LASER_ORIGIN_Y * (1 - phase)

  // Horizontal: screen centre + scaled drag, clamped to play field.
  const rawX = GAME_WIDTH / 2 + dragOffsetX * AIM_GAIN
  const x = Math.max(0, Math.min(GAME_WIDTH, rawX))

  return { x, y }
}
