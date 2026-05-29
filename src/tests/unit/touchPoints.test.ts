import { describe, it, expect } from 'vitest'
import {
  generateTouchPointLayout,
  createInitialLayout,
  type ActiveSkillAssignment,
} from '../../game/entities/touchPoints'
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PIXELS_PER_CM,
  TOUCHPOINT_ARC_CM,
  TOUCHPOINT_EDGE_X_CM,
  TOUCHPOINT_EDGE_Y_CM,
  TOUCHPOINT_ARC_ANGLE_MIN,
  TOUCHPOINT_ARC_ANGLE_MAX,
  SLOW_SKILL_ROTATION_PERIOD_MS,
  FAST_SKILL_ROTATION_PERIOD_MS,
  WHITE_SHOT_ROTATION_PERIOD_MS,
  FIREBALL_ROTATION_PERIOD_MS,
  LEFT_SIDE_SKILL,
  RIGHT_SIDE_SKILL,
} from '../../game/constants'
import { skillTypeForSide } from '../../game/systems/InputManager'
import { computeTouchPointPositions } from '../../game/entities/touchPoints'
import { InputManager } from '../../game/systems/InputManager'
import type { InputEvent } from '../../types'

// ============================================================
// Helpers
// ============================================================

const W = GAME_WIDTH
const H = GAME_HEIGHT
const PX = PIXELS_PER_CM

function makeLeft(count: number): ActiveSkillAssignment[] {
  return Array.from({ length: count }, (_, i) => ({
    skillType: 'slow_shot' as const,
    side: 'left' as const,
    slotIndex: i,
  }))
}

function makeRight(count: number): ActiveSkillAssignment[] {
  return Array.from({ length: count }, (_, i) => ({
    skillType: 'fast_shot' as const,
    side: 'right' as const,
    slotIndex: i,
  }))
}

/** Compute the arc bounds for verifying positions. */
function arcBounds() {
  const arc = TOUCHPOINT_ARC_CM * PX
  const edgeX = TOUCHPOINT_EDGE_X_CM * PX
  const edgeY = TOUCHPOINT_EDGE_Y_CM * PX
  const aMin = TOUCHPOINT_ARC_ANGLE_MIN * Math.PI / 180
  const aMax = TOUCHPOINT_ARC_ANGLE_MAX * Math.PI / 180
  // y = H - edgeY - arc * sin(angle)
  // sin(aMin) < sin(aMax), so y at aMin is larger (closer to bottom)
  const yAtMin = H - edgeY - arc * Math.sin(aMin) // larger y (closer to bottom of screen)
  const yAtMax = H - edgeY - arc * Math.sin(aMax) // smaller y (higher up on screen)
  return {
    // Left side x bounds: cos(aMax) < cos(aMin) → x at aMax is smaller
    leftXMin: 0 + edgeX + arc * Math.cos(aMax),
    leftXMax: 0 + edgeX + arc * Math.cos(aMin),
    // Right side x bounds: x = W - (edgeX + arc*cos(angle))
    rightXMin: W - (edgeX + arc * Math.cos(aMin)), // smaller x
    rightXMax: W - (edgeX + arc * Math.cos(aMax)), // larger x
    // y bounds: yAtMax < yAtMin (higher angle = higher up on screen = smaller y)
    yMin: yAtMax,  // smallest y value seen
    yMax: yAtMin,  // largest y value seen
  }
}

// ============================================================
// AC#6 — Skill type correctly assigned per side for 1-point config
// ============================================================

describe('AC#6 — skill type assignment per side (1-point config)', () => {
  // Task-38: LEFT_SIDE_SKILL = white_shot, RIGHT_SIDE_SKILL = fireball
  it('left side skill is white_shot (task-38)', () => {
    expect(LEFT_SIDE_SKILL).toBe('white_shot')
  })

  it('right side skill is fireball (task-38)', () => {
    expect(RIGHT_SIDE_SKILL).toBe('fireball')
  })

  it('skillTypeForSide("left") returns white_shot (task-38)', () => {
    expect(skillTypeForSide('left')).toBe('white_shot')
  })

  it('skillTypeForSide("right") returns fireball (task-38)', () => {
    expect(skillTypeForSide('right')).toBe('fireball')
  })

  it('createInitialLayout returns 2 points (1 per side)', () => {
    const layout = createInitialLayout(W, H, PX)
    expect(layout).toHaveLength(2)
  })

  it('createInitialLayout left point has skillType white_shot (task-38)', () => {
    const layout = createInitialLayout(W, H, PX)
    const left = layout.find(p => p.side === 'left')
    expect(left).toBeDefined()
    expect(left!.skillType).toBe('white_shot')
  })

  it('createInitialLayout right point has skillType fireball (task-38)', () => {
    const layout = createInitialLayout(W, H, PX)
    const right = layout.find(p => p.side === 'right')
    expect(right).toBeDefined()
    expect(right!.skillType).toBe('fireball')
  })

  it('createInitialLayout left point has rotationPeriodMs = WHITE_SHOT_ROTATION_PERIOD_MS (task-38)', () => {
    const layout = createInitialLayout(W, H, PX)
    const left = layout.find(p => p.side === 'left')!
    expect(left.rotationPeriodMs).toBe(WHITE_SHOT_ROTATION_PERIOD_MS)
  })

  it('createInitialLayout right point has rotationPeriodMs = FIREBALL_ROTATION_PERIOD_MS (task-38)', () => {
    const layout = createInitialLayout(W, H, PX)
    const right = layout.find(p => p.side === 'right')!
    expect(right.rotationPeriodMs).toBe(FIREBALL_ROTATION_PERIOD_MS)
  })

  it('InputManager routes left-side touch to white_shot (task-38)', () => {
    const positions = computeTouchPointPositions(W, H, PX)
    const manager = new InputManager(positions)
    // Touch near 'green' (left side)
    const greenPos = positions.find(p => p.id === 'green')!
    const events: InputEvent[] = [{ pointerId: 1, action: 'down', x: greenPos.x, y: greenPos.y, timestamp: 0 }]
    const cmds = manager.update(events)
    expect(cmds).toHaveLength(1)
    expect(cmds[0].skillType).toBe('white_shot')
  })

  it('InputManager routes right-side touch to fireball (task-38)', () => {
    const positions = computeTouchPointPositions(W, H, PX)
    const manager = new InputManager(positions)
    // Touch near 'blue' (right side)
    const bluePos = positions.find(p => p.id === 'blue')!
    const events: InputEvent[] = [{ pointerId: 1, action: 'down', x: bluePos.x, y: bluePos.y, timestamp: 0 }]
    const cmds = manager.update(events)
    expect(cmds).toHaveLength(1)
    expect(cmds[0].skillType).toBe('fireball')
  })

  it('FireCommand includes white_shot for left-side fire (task-38)', () => {
    const positions = computeTouchPointPositions(W, H, PX)
    const manager = new InputManager(positions)
    const greenPos = positions.find(p => p.id === 'green')!
    manager.update([{ pointerId: 1, action: 'down', x: greenPos.x, y: greenPos.y, timestamp: 0 }])
    const cmds = manager.update([{ pointerId: 1, action: 'up', x: greenPos.x, y: greenPos.y, timestamp: 100 }])
    expect(cmds).toHaveLength(1)
    expect(cmds[0].type).toBe('fire')
    expect(cmds[0].skillType).toBe('white_shot')
  })

  it('FireCommand includes fireball for right-side fire (task-38)', () => {
    const positions = computeTouchPointPositions(W, H, PX)
    const manager = new InputManager(positions)
    const bluePos = positions.find(p => p.id === 'blue')!
    manager.update([{ pointerId: 1, action: 'down', x: bluePos.x, y: bluePos.y, timestamp: 0 }])
    const cmds = manager.update([{ pointerId: 1, action: 'up', x: bluePos.x, y: bluePos.y, timestamp: 100 }])
    expect(cmds).toHaveLength(1)
    expect(cmds[0].type).toBe('fire')
    expect(cmds[0].skillType).toBe('fireball')
  })

  it('all left-side named touch points (green, violet, orange) route to white_shot (task-38)', () => {
    const positions = computeTouchPointPositions(W, H, PX)
    const manager = new InputManager(positions)
    for (const id of ['green', 'violet', 'orange']) {
      const pos = positions.find(p => p.id === id)!
      const cmds = manager.update([{ pointerId: 1, action: 'down', x: pos.x, y: pos.y, timestamp: 0 }])
      expect(cmds[0].skillType).toBe('white_shot')
      manager.reset()
    }
  })

  it('all right-side named touch points (blue, red, yellow) route to fireball (task-38)', () => {
    const positions = computeTouchPointPositions(W, H, PX)
    const manager = new InputManager(positions)
    for (const id of ['blue', 'red', 'yellow']) {
      const pos = positions.find(p => p.id === id)!
      const cmds = manager.update([{ pointerId: 1, action: 'down', x: pos.x, y: pos.y, timestamp: 0 }])
      expect(cmds[0].skillType).toBe('fireball')
      manager.reset()
    }
  })
})

// ============================================================
// AC#7 — Layout positions are within arc bounds for 1, 2, and 3 points per side
// ============================================================

describe('AC#7 — layout positions within arc bounds (1, 2, 3 points per side)', () => {
  const bounds = arcBounds()

  for (const count of [1, 2, 3] as const) {
    describe(`${count} point(s) per side`, () => {
      it(`generates exactly ${count} left and ${count} right points`, () => {
        const layout = generateTouchPointLayout(makeLeft(count), makeRight(count), W, H, PX)
        const left = layout.filter(p => p.side === 'left')
        const right = layout.filter(p => p.side === 'right')
        expect(left).toHaveLength(count)
        expect(right).toHaveLength(count)
      })

      it(`left points (count=${count}) have x within arc bounds`, () => {
        const layout = generateTouchPointLayout(makeLeft(count), makeRight(count), W, H, PX)
        for (const pt of layout.filter(p => p.side === 'left')) {
          expect(pt.x).toBeGreaterThanOrEqual(bounds.leftXMin - 0.001)
          expect(pt.x).toBeLessThanOrEqual(bounds.leftXMax + 0.001)
        }
      })

      it(`right points (count=${count}) have x within arc bounds`, () => {
        const layout = generateTouchPointLayout(makeLeft(count), makeRight(count), W, H, PX)
        for (const pt of layout.filter(p => p.side === 'right')) {
          expect(pt.x).toBeGreaterThanOrEqual(bounds.rightXMin - 0.001)
          expect(pt.x).toBeLessThanOrEqual(bounds.rightXMax + 0.001)
        }
      })

      it(`all points (count=${count}) have y within arc bounds`, () => {
        const layout = generateTouchPointLayout(makeLeft(count), makeRight(count), W, H, PX)
        for (const pt of layout) {
          expect(pt.y).toBeGreaterThanOrEqual(bounds.yMin - 0.001)
          expect(pt.y).toBeLessThanOrEqual(bounds.yMax + 0.001)
        }
      })
    })
  }

  it('1-point layout places left at arc midpoint angle (50°)', () => {
    const layout = generateTouchPointLayout(makeLeft(1), makeRight(1), W, H, PX)
    const left = layout.find(p => p.side === 'left')!
    const midAngle = (TOUCHPOINT_ARC_ANGLE_MIN + TOUCHPOINT_ARC_ANGLE_MAX) / 2
    const arc = TOUCHPOINT_ARC_CM * PX
    const edgeX = TOUCHPOINT_EDGE_X_CM * PX
    const edgeY = TOUCHPOINT_EDGE_Y_CM * PX
    const a = midAngle * Math.PI / 180
    const expectedX = 0 + edgeX + arc * Math.cos(a)
    const expectedY = H - edgeY - arc * Math.sin(a)
    expect(left.x).toBeCloseTo(expectedX, 5)
    expect(left.y).toBeCloseTo(expectedY, 5)
  })

  it('1-point layout places right at arc midpoint angle (50°)', () => {
    const layout = generateTouchPointLayout(makeLeft(1), makeRight(1), W, H, PX)
    const right = layout.find(p => p.side === 'right')!
    const midAngle = (TOUCHPOINT_ARC_ANGLE_MIN + TOUCHPOINT_ARC_ANGLE_MAX) / 2
    const arc = TOUCHPOINT_ARC_CM * PX
    const edgeX = TOUCHPOINT_EDGE_X_CM * PX
    const edgeY = TOUCHPOINT_EDGE_Y_CM * PX
    const a = midAngle * Math.PI / 180
    const expectedX = W - (edgeX + arc * Math.cos(a))
    const expectedY = H - edgeY - arc * Math.sin(a)
    expect(right.x).toBeCloseTo(expectedX, 5)
    expect(right.y).toBeCloseTo(expectedY, 5)
  })

  it('3-point layout left uses angles 22°, 50°, 78°', () => {
    const layout = generateTouchPointLayout(makeLeft(3), makeRight(3), W, H, PX)
    const leftPts = layout.filter(p => p.side === 'left').sort((a, b) => a.y - b.y) // lower y = smaller angle = higher on screen
    const arc = TOUCHPOINT_ARC_CM * PX
    const edgeX = TOUCHPOINT_EDGE_X_CM * PX
    const edgeY = TOUCHPOINT_EDGE_Y_CM * PX
    for (let i = 0; i < 3; i++) {
      const angleDeg = TOUCHPOINT_ARC_ANGLE_MIN + i * (TOUCHPOINT_ARC_ANGLE_MAX - TOUCHPOINT_ARC_ANGLE_MIN) / 2
      const a = angleDeg * Math.PI / 180
      const expectedX = 0 + edgeX + arc * Math.cos(a)
      const expectedY = H - edgeY - arc * Math.sin(a)
      // Find the closest point to the expected position
      const closest = leftPts.reduce((best, pt) => {
        const dBest = Math.abs(best.x - expectedX) + Math.abs(best.y - expectedY)
        const dPt = Math.abs(pt.x - expectedX) + Math.abs(pt.y - expectedY)
        return dPt < dBest ? pt : best
      })
      expect(closest.x).toBeCloseTo(expectedX, 3)
      expect(closest.y).toBeCloseTo(expectedY, 3)
    }
  })

  it('2-point layout left uses min and max arc angles (22° and 78°)', () => {
    const layout = generateTouchPointLayout(makeLeft(2), makeRight(2), W, H, PX)
    const leftPts = layout.filter(p => p.side === 'left')
    const arc = TOUCHPOINT_ARC_CM * PX
    const edgeX = TOUCHPOINT_EDGE_X_CM * PX
    const edgeY = TOUCHPOINT_EDGE_Y_CM * PX

    const aMin = TOUCHPOINT_ARC_ANGLE_MIN * Math.PI / 180
    const aMax = TOUCHPOINT_ARC_ANGLE_MAX * Math.PI / 180
    const expectedPositions = [
      { x: edgeX + arc * Math.cos(aMin), y: H - edgeY - arc * Math.sin(aMin) },
      { x: edgeX + arc * Math.cos(aMax), y: H - edgeY - arc * Math.sin(aMax) },
    ]

    for (const expected of expectedPositions) {
      const match = leftPts.find(pt =>
        Math.abs(pt.x - expected.x) < 0.01 && Math.abs(pt.y - expected.y) < 0.01
      )
      expect(match).toBeDefined()
    }
  })

  it('points are evenly spaced (equal angle delta between consecutive points, count=3)', () => {
    const layout = generateTouchPointLayout(makeLeft(3), makeRight(3), W, H, PX)
    const arc = TOUCHPOINT_ARC_CM * PX
    const edgeX = TOUCHPOINT_EDGE_X_CM * PX

    const leftPts = layout.filter(p => p.side === 'left')
    // Sort by x descending (angle increases left to right along arc from corner)
    const sorted = [...leftPts].sort((a, b) => b.x - a.x)
    // Compute angles from positions
    const angles = sorted.map(pt => {
      const cosA = (pt.x - edgeX) / arc
      return Math.acos(Math.min(1, Math.max(-1, cosA))) * 180 / Math.PI
    })
    // Angle deltas should be equal
    const delta1 = angles[1] - angles[0]
    const delta2 = angles[2] - angles[1]
    expect(delta2).toBeCloseTo(delta1, 3)
  })
})

// ============================================================
// generateTouchPointLayout — basic API contract
// ============================================================

describe('generateTouchPointLayout — API contract', () => {
  it('accepts 1 left + 1 right and returns 2 points', () => {
    const layout = generateTouchPointLayout(makeLeft(1), makeRight(1), W, H, PX)
    expect(layout).toHaveLength(2)
  })

  it('accepts 3 left + 3 right and returns 6 points', () => {
    const layout = generateTouchPointLayout(makeLeft(3), makeRight(3), W, H, PX)
    expect(layout).toHaveLength(6)
  })

  it('all left points have side="left"', () => {
    const layout = generateTouchPointLayout(makeLeft(2), makeRight(2), W, H, PX)
    for (const pt of layout.filter(p => p.side === 'left')) {
      expect(pt.side).toBe('left')
    }
  })

  it('all right points have side="right"', () => {
    const layout = generateTouchPointLayout(makeLeft(2), makeRight(2), W, H, PX)
    for (const pt of layout.filter(p => p.side === 'right')) {
      expect(pt.side).toBe('right')
    }
  })

  it('left point ids are "left_0", "left_1", "left_2" for 3 points', () => {
    const layout = generateTouchPointLayout(makeLeft(3), makeRight(3), W, H, PX)
    const leftIds = layout.filter(p => p.side === 'left').map(p => p.id).sort()
    expect(leftIds).toEqual(['left_0', 'left_1', 'left_2'])
  })

  it('right point ids are "right_0", "right_1", "right_2" for 3 points', () => {
    const layout = generateTouchPointLayout(makeLeft(3), makeRight(3), W, H, PX)
    const rightIds = layout.filter(p => p.side === 'right').map(p => p.id).sort()
    expect(rightIds).toEqual(['right_0', 'right_1', 'right_2'])
  })

  it('slow_shot assignments get SLOW_SKILL_ROTATION_PERIOD_MS', () => {
    const layout = generateTouchPointLayout(makeLeft(2), makeRight(1), W, H, PX)
    for (const pt of layout.filter(p => p.skillType === 'slow_shot')) {
      expect(pt.rotationPeriodMs).toBe(SLOW_SKILL_ROTATION_PERIOD_MS)
    }
  })

  it('fast_shot assignments get FAST_SKILL_ROTATION_PERIOD_MS', () => {
    const layout = generateTouchPointLayout(makeLeft(1), makeRight(2), W, H, PX)
    for (const pt of layout.filter(p => p.skillType === 'fast_shot')) {
      expect(pt.rotationPeriodMs).toBe(FAST_SKILL_ROTATION_PERIOD_MS)
    }
  })

  it('mixed skill assignments are respected', () => {
    // Left: fast_shot, Right: slow_shot (non-default config)
    const leftFast: ActiveSkillAssignment[] = [{ skillType: 'fast_shot', side: 'left', slotIndex: 0 }]
    const rightSlow: ActiveSkillAssignment[] = [{ skillType: 'slow_shot', side: 'right', slotIndex: 0 }]
    const layout = generateTouchPointLayout(leftFast, rightSlow, W, H, PX)
    const left = layout.find(p => p.side === 'left')!
    const right = layout.find(p => p.side === 'right')!
    expect(left.skillType).toBe('fast_shot')
    expect(right.skillType).toBe('slow_shot')
  })
})
