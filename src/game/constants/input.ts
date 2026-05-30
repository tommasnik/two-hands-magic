import type { TouchPointDef } from '../../types'
import { GAME_HEIGHT, PIXELS_PER_CM } from './canvas'

// ============================================================
// Touch input limits
// ============================================================

/**
 * Maximum number of simultaneous active touch pointers the game accepts.
 * One per hand — the third (and any further) finger is ignored.
 * Unit: count. Affects: InputManager pointer acceptance, multi-touch fairness.
 */
export const MAX_SIMULTANEOUS_TOUCHES = 2

// ============================================================
// Aim / input model
// ============================================================

/**
 * Horizontal drag multiplier applied to finger drift when computing aim target X.
 * Higher = more sensitive / wider sweep. Unit: dimensionless multiplier. Affects: aim spread.
 */
export const AIM_GAIN = 4.0

// ============================================================
// Touch point layout geometry
// ============================================================

/**
 * Arc radius for touch point layout along bottom corners.
 * Larger value spreads points further apart for easier individual targeting.
 * Unit: cm. Affects: horizontal and vertical spacing between touch points.
 */
export const TOUCHPOINT_ARC_CM = 3.4

/** Minimum horizontal offset from screen edge for touch point arc. Unit: cm. */
export const TOUCHPOINT_EDGE_X_CM = 1.0

/** Minimum vertical offset from screen bottom for touch point arc. Unit: cm. */
export const TOUCHPOINT_EDGE_Y_CM = 1.0

/**
 * Minimum arc angle for touch point layout (closest to corner edge).
 * Unit: degrees. Affects: touch point arc start position.
 */
export const TOUCHPOINT_ARC_ANGLE_MIN = 22

/**
 * Maximum arc angle for touch point layout (furthest from corner edge).
 * Unit: degrees. Affects: touch point arc end position.
 */
export const TOUCHPOINT_ARC_ANGLE_MAX = 78

/**
 * Fixed Y origin for all laser sweeps — equals the Y position of the highest
 * touch point in a full 6-slot layout (angle = TOUCHPOINT_ARC_ANGLE_MAX).
 * Laser reticles sweep from this Y up to 0; the aim is never below this level.
 * Unit: px.
 */
export const LASER_ORIGIN_Y =
  GAME_HEIGHT
  - TOUCHPOINT_EDGE_Y_CM * PIXELS_PER_CM
  - TOUCHPOINT_ARC_CM * PIXELS_PER_CM * Math.sin(TOUCHPOINT_ARC_ANGLE_MAX * Math.PI / 180)

/**
 * Visual radius of touch point circles.
 * Increased from 22 to 30 for more comfortable thumb targeting on mobile.
 * Unit: px. Affects: tap target size and visual prominence of touch points.
 */
export const TOUCHPOINT_RADIUS = 30

// ============================================================
// Touch point definitions
// 6 fixed points: 3 on the left side, 3 on the right side.
// Colors and rotation speeds are intentionally scrambled —
// not ordered slow→fast or left→right.
// ============================================================

/** Green — left side, slow-ish. */
export const TP_GREEN: TouchPointDef = { side: 'left',  angle: 22, color: '#5cff3a', rotationPeriodMs: 2200 }

/** Violet — left side, very fast. */
export const TP_VIOLET: TouchPointDef = { side: 'left',  angle: 50, color: '#b833ff', rotationPeriodMs: 600 }

/** Orange — left side, medium. */
export const TP_ORANGE: TouchPointDef = { side: 'left',  angle: 78, color: '#ff9410', rotationPeriodMs: 1400 }

/** Blue — right side, slowest. */
export const TP_BLUE: TouchPointDef  = { side: 'right', angle: 22, color: '#3a8cff', rotationPeriodMs: 2800 }

/** Red — right side, fast. */
export const TP_RED: TouchPointDef   = { side: 'right', angle: 50, color: '#ff2a3c', rotationPeriodMs: 900 }

/** Yellow — right side, medium-slow. */
export const TP_YELLOW: TouchPointDef = { side: 'right', angle: 78, color: '#ffe53a', rotationPeriodMs: 1700 }

/** All 6 touch-point definitions in render/assignment order. */
export const TOUCH_POINT_DEFS: readonly TouchPointDef[] = [
  TP_GREEN,
  TP_VIOLET,
  TP_ORANGE,
  TP_BLUE,
  TP_RED,
  TP_YELLOW,
]
