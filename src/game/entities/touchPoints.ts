import type { SkillType, TouchPoint, TouchPointId } from '../../types'
import {
  TP_GREEN,
  TP_VIOLET,
  TP_ORANGE,
  TP_BLUE,
  TP_RED,
  TP_YELLOW,
  TOUCH_POINT_DEFS,
  TOUCHPOINT_ARC_CM,
  TOUCHPOINT_EDGE_X_CM,
  TOUCHPOINT_EDGE_Y_CM,
  TOUCHPOINT_ARC_ANGLE_MIN,
  TOUCHPOINT_ARC_ANGLE_MAX,
  SLOW_SKILL_ROTATION_PERIOD_MS,
  FAST_SKILL_ROTATION_PERIOD_MS,
  WHITE_SHOT_ROTATION_PERIOD_MS,
  FIREBALL_ROTATION_PERIOD_MS,
  ICE_CRYSTAL_ROTATION_PERIOD_MS,
  LIGHTNING_BLAST_ROTATION_PERIOD_MS,
  DEFAULT_SKILL_CONFIG,
  GAME_WIDTH,
  GAME_HEIGHT,
  PIXELS_PER_CM,
} from '../constants'

/**
 * All 6 touch points in layout order.
 * Left side (green, violet, orange) — right side (blue, red, yellow).
 * positionIndex: 0 = closest to corner edge (highest y), 2 = furthest (lowest y).
 */
export const TOUCH_POINTS: readonly TouchPoint[] = [
  {
    id: 'green',
    color: TP_GREEN.color,
    rotationPeriodMs: TP_GREEN.rotationPeriodMs,
    cornerAnchor: 'LEFT',
    positionIndex: 0,
  },
  {
    id: 'violet',
    color: TP_VIOLET.color,
    rotationPeriodMs: TP_VIOLET.rotationPeriodMs,
    cornerAnchor: 'LEFT',
    positionIndex: 1,
  },
  {
    id: 'orange',
    color: TP_ORANGE.color,
    rotationPeriodMs: TP_ORANGE.rotationPeriodMs,
    cornerAnchor: 'LEFT',
    positionIndex: 2,
  },
  {
    id: 'blue',
    color: TP_BLUE.color,
    rotationPeriodMs: TP_BLUE.rotationPeriodMs,
    cornerAnchor: 'RIGHT',
    positionIndex: 0,
  },
  {
    id: 'red',
    color: TP_RED.color,
    rotationPeriodMs: TP_RED.rotationPeriodMs,
    cornerAnchor: 'RIGHT',
    positionIndex: 1,
  },
  {
    id: 'yellow',
    color: TP_YELLOW.color,
    rotationPeriodMs: TP_YELLOW.rotationPeriodMs,
    cornerAnchor: 'RIGHT',
    positionIndex: 2,
  },
]

/** Computed screen position for a touch point. */
export interface TouchPointScreenPos {
  id: TouchPointId
  x: number
  y: number
}

/**
 * Computes screen pixel positions for all 6 touch points using the arc layout formula.
 * Points are placed in arcs around the bottom corners of the canvas.
 * All angle values come from TOUCH_POINT_DEFS (same order as TOUCH_POINTS).
 */
export function computeTouchPointPositions(W: number, H: number, pxCm: number): TouchPointScreenPos[] {
  const arc = TOUCHPOINT_ARC_CM * pxCm
  const edgeX = TOUCHPOINT_EDGE_X_CM * pxCm
  const edgeY = TOUCHPOINT_EDGE_Y_CM * pxCm
  return TOUCH_POINTS.map((tp, i) => {
    const def = TOUCH_POINT_DEFS[i]
    const a = def.angle * Math.PI / 180
    const xSign = tp.cornerAnchor === 'LEFT' ? 1 : -1
    const cornerX = tp.cornerAnchor === 'LEFT' ? 0 : W
    return {
      id: tp.id,
      x: cornerX + xSign * (edgeX + arc * Math.cos(a)),
      y: H - edgeY - arc * Math.sin(a),
    }
  })
}

// ============================================================
// Data-driven layout — 1–3 active skills per side
// ============================================================

/**
 * Descriptor for a single active skill slot in the dynamic layout.
 * Contains the skill type and an index within its side (0-based).
 */
export interface ActiveSkillAssignment {
  /** Skill type determines damage, rotation speed, and projectile behaviour. */
  skillType: SkillType
  /** Which side of the screen this point is on. */
  side: 'left' | 'right'
  /** Zero-based index within this side (0 = first slot). */
  slotIndex: number
}

/**
 * Extended screen position for a dynamically-generated touch point.
 * Includes skill type for routing fire commands to the correct skill system.
 */
export interface ActiveTouchPointPos {
  /** Unique identifier derived from side and slot ("left_0", "right_0", etc.). */
  id: string
  /** Horizontal canvas position. Unit: px. */
  x: number
  /** Vertical canvas position. Unit: px. */
  y: number
  /** Which side of the screen. */
  side: 'left' | 'right'
  /** Skill type routed to this touch point. */
  skillType: SkillType
  /** Laser rotation period for this skill. Unit: ms. */
  rotationPeriodMs: number
}

/**
 * Computes evenly-spaced arc positions for 1–3 active touch points per side.
 *
 * Arc angles are interpolated across the range [TOUCHPOINT_ARC_ANGLE_MIN, TOUCHPOINT_ARC_ANGLE_MAX]:
 *   - 1 point  → placed at the midpoint of the arc
 *   - 2 points → placed at min and max angles
 *   - 3 points → placed at min, mid, and max angles
 *
 * Left side uses LEFT_SIDE_SKILL (slow_shot) with SLOW_SKILL_ROTATION_PERIOD_MS.
 * Right side uses RIGHT_SIDE_SKILL (fast_shot) with FAST_SKILL_ROTATION_PERIOD_MS.
 *
 * @param activeLeft  Array of 1–3 skill assignments for the left side
 * @param activeRight Array of 1–3 skill assignments for the right side
 * @param W           Canvas width in pixels
 * @param H           Canvas height in pixels
 * @param pxCm        Pixels per centimeter
 */
export function generateTouchPointLayout(
  activeLeft: ActiveSkillAssignment[],
  activeRight: ActiveSkillAssignment[],
  W: number,
  H: number,
  pxCm: number,
): ActiveTouchPointPos[] {
  const arc = TOUCHPOINT_ARC_CM * pxCm
  const edgeX = TOUCHPOINT_EDGE_X_CM * pxCm
  const edgeY = TOUCHPOINT_EDGE_Y_CM * pxCm

  function angleForSlot(slotIndex: number, count: number): number {
    if (count === 1) {
      return (TOUCHPOINT_ARC_ANGLE_MIN + TOUCHPOINT_ARC_ANGLE_MAX) / 2
    }
    // Evenly space across the arc range
    return TOUCHPOINT_ARC_ANGLE_MIN + slotIndex * (TOUCHPOINT_ARC_ANGLE_MAX - TOUCHPOINT_ARC_ANGLE_MIN) / (count - 1)
  }

  function rotationPeriodForSkill(skillType: SkillType): number {
    switch (skillType) {
      case 'slow_shot':       return SLOW_SKILL_ROTATION_PERIOD_MS
      case 'fast_shot':       return FAST_SKILL_ROTATION_PERIOD_MS
      case 'white_shot':      return WHITE_SHOT_ROTATION_PERIOD_MS
      case 'fireball':        return FIREBALL_ROTATION_PERIOD_MS
      case 'ice_crystal':     return ICE_CRYSTAL_ROTATION_PERIOD_MS
      case 'lightning_blast': return LIGHTNING_BLAST_ROTATION_PERIOD_MS
    }
  }

  const result: ActiveTouchPointPos[] = []

  for (const assignment of activeLeft) {
    const angleDeg = angleForSlot(assignment.slotIndex, activeLeft.length)
    const a = angleDeg * Math.PI / 180
    result.push({
      id: `left_${assignment.slotIndex}`,
      x: 0 + (edgeX + arc * Math.cos(a)),
      y: H - edgeY - arc * Math.sin(a),
      side: 'left',
      skillType: assignment.skillType,
      rotationPeriodMs: rotationPeriodForSkill(assignment.skillType),
    })
  }

  for (const assignment of activeRight) {
    const angleDeg = angleForSlot(assignment.slotIndex, activeRight.length)
    const a = angleDeg * Math.PI / 180
    result.push({
      id: `right_${assignment.slotIndex}`,
      x: W - (edgeX + arc * Math.cos(a)),
      y: H - edgeY - arc * Math.sin(a),
      side: 'right',
      skillType: assignment.skillType,
      rotationPeriodMs: rotationPeriodForSkill(assignment.skillType),
    })
  }

  return result
}

/**
 * Creates the default initial layout from DEFAULT_SKILL_CONFIG.
 * W/H/pxCm default to GAME_WIDTH, GAME_HEIGHT, PIXELS_PER_CM for convenience in tests.
 */
export function createInitialLayout(
  W: number = GAME_WIDTH,
  H: number = GAME_HEIGHT,
  pxCm: number = PIXELS_PER_CM,
): ActiveTouchPointPos[] {
  const activeLeft: ActiveSkillAssignment[] = DEFAULT_SKILL_CONFIG
    .filter(s => s.side === 'left')
    .map(s => ({ skillType: s.skillType, side: 'left' as const, slotIndex: s.slotIndex }))
  const activeRight: ActiveSkillAssignment[] = DEFAULT_SKILL_CONFIG
    .filter(s => s.side === 'right')
    .map(s => ({ skillType: s.skillType, side: 'right' as const, slotIndex: s.slotIndex }))
  return generateTouchPointLayout(activeLeft, activeRight, W, H, pxCm)
}
