import type { InputEvent, SkillType } from '../../types'
import { LEFT_SIDE_SKILL, RIGHT_SIDE_SKILL, MAX_SIMULTANEOUS_TOUCHES } from '../constants'

export interface AimCommand {
  type: 'aim'
  touchPointId: string
  dragOffsetX: number
  /** Skill type routed from the touch point side assignment. */
  skillType: SkillType
}

export interface FireCommand {
  type: 'fire'
  touchPointId: string
  dragOffsetX: number
  /** Skill type routed from the touch point side assignment. */
  skillType: SkillType
}

export type GameCommand = AimCommand | FireCommand

/**
 * Extended touch point position descriptor used by InputManager.
 * Can be either the legacy named-color form or the dynamic layout form.
 */
export interface TouchPointEntry {
  /** Unique identifier for this touch point. */
  id: string
  /** Horizontal canvas position. Unit: px. */
  x: number
  /** Vertical canvas position. Unit: px. */
  y: number
  /** Which side of the screen. Determines skill routing. */
  side: 'left' | 'right'
}

interface PointerState {
  touchPointId: string
  skillType: SkillType
  startX: number
  currentX: number
}

/**
 * Maps a screen side to the assigned skill type.
 * Left side → LEFT_SIDE_SKILL (slow_shot), right side → RIGHT_SIDE_SKILL (fast_shot).
 */
export function skillTypeForSide(side: 'left' | 'right'): SkillType {
  return side === 'left' ? LEFT_SIDE_SKILL : RIGHT_SIDE_SKILL
}

/**
 * InputManager processes raw InputEvents and produces typed GameCommands.
 *
 * Maps pointer positions to touch points by nearest Euclidean distance to the
 * precomputed arc positions (see computeTouchPointPositions).
 *
 * Each command includes a skillType derived from the touch point's side:
 *   - Left-side touch points → LEFT_SIDE_SKILL (slow_shot)
 *   - Right-side touch points → RIGHT_SIDE_SKILL (fast_shot)
 *
 * Supports up to 6 simultaneous pointers (one per touch point).
 * update() is a pure-ish function — it reads/mutates internal drag state
 * but given the same event sequence always produces the same output.
 * Call reset() between test runs to clear state.
 */
export class InputManager {
  private readonly _pointers = new Map<number, PointerState>()
  private readonly _touchPointEntries: TouchPointEntry[]

  /**
   * @param touchPointPositions - Either an array of named touch point positions
   *   (legacy form: `{ id: TouchPointId; x; y }`) or full TouchPointEntry objects
   *   (dynamic layout form: `{ id: string; x; y; side }`).
   *   When using the legacy form, side is derived from the named color IDs.
   */
  constructor(
    touchPointPositions: Array<{ id: string; x: number; y: number; side?: 'left' | 'right' }>,
  ) {
    // Derive side from touch point color names for backward compatibility when side is not provided.
    // Left-side IDs: green, violet, orange. Right-side IDs: blue, red, yellow.
    const LEFT_IDS = new Set<string>(['green', 'violet', 'orange'])
    this._touchPointEntries = touchPointPositions.map(tp => ({
      id: tp.id,
      x: tp.x,
      y: tp.y,
      side: tp.side ?? (LEFT_IDS.has(tp.id) ? 'left' : 'right'),
    }))
  }

  private findNearestTouchPoint(x: number, y: number): TouchPointEntry {
    let best = this._touchPointEntries[0]
    let bestDist = Infinity
    for (const tp of this._touchPointEntries) {
      const dx = x - tp.x
      const dy = y - tp.y
      const d = dx * dx + dy * dy
      if (d < bestDist) {
        bestDist = d
        best = tp
      }
    }
    return best
  }

  update(events: InputEvent[]): GameCommand[] {
    const commands: GameCommand[] = []

    for (const event of events) {
      switch (event.action) {
        case 'down': {
          // Ignore 3rd+ simultaneous pointers — max MAX_SIMULTANEOUS_TOUCHES active at once
          if (this._pointers.size >= MAX_SIMULTANEOUS_TOUCHES) break
          const tp = this.findNearestTouchPoint(event.x, event.y)
          const skillType = skillTypeForSide(tp.side)
          this._pointers.set(event.pointerId, {
            touchPointId: tp.id,
            skillType,
            startX: event.x,
            currentX: event.x,
          })
          commands.push({
            type: 'aim',
            touchPointId: tp.id,
            skillType,
            dragOffsetX: 0,
          })
          break
        }

        case 'move': {
          const state = this._pointers.get(event.pointerId)
          if (state === undefined) break
          state.currentX = event.x
          commands.push({
            type: 'aim',
            touchPointId: state.touchPointId,
            skillType: state.skillType,
            dragOffsetX: event.x - state.startX,
          })
          break
        }

        case 'up': {
          const state = this._pointers.get(event.pointerId)
          if (state === undefined) break
          const dragOffsetX = state.currentX - state.startX
          this._pointers.delete(event.pointerId)
          commands.push({
            type: 'fire',
            touchPointId: state.touchPointId,
            skillType: state.skillType,
            dragOffsetX,
          })
          break
        }
      }
    }

    return commands
  }

  reset(): void {
    this._pointers.clear()
  }
}
