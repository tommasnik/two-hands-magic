import { describe, it, expect, beforeEach } from 'vitest'
import { InputManager } from '../../game/systems/InputManager'
import { computeTouchPointPositions } from '../../game/entities/touchPoints'
import { GAME_WIDTH, GAME_HEIGHT, PIXELS_PER_CM, MAX_SIMULTANEOUS_TOUCHES } from '../../game/constants'
import type { InputEvent } from '../../types'
import type { GameCommand } from '../../game/systems/InputManager'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ts = 0 // timestamp is irrelevant for pure logic tests

// Precomputed arc touch point positions used by all tests
const TEST_POSITIONS = computeTouchPointPositions(GAME_WIDTH, GAME_HEIGHT, PIXELS_PER_CM)

function downEvent(pointerId: number, x: number, y: number): InputEvent {
  return { pointerId, action: 'down', x, y, timestamp: ts }
}

function moveEvent(pointerId: number, x: number, y: number): InputEvent {
  return { pointerId, action: 'move', x, y, timestamp: ts }
}

function upEvent(pointerId: number, x: number, y: number): InputEvent {
  return { pointerId, action: 'up', x, y, timestamp: ts }
}

// Positions derived from computed arc touch point positions.
// Using exact computed positions ensures tests are not affected by layout constant changes.
const GREEN_POS  = TEST_POSITIONS.find(p => p.id === 'green')!
const VIOLET_POS = TEST_POSITIONS.find(p => p.id === 'violet')!
const ORANGE_POS = TEST_POSITIONS.find(p => p.id === 'orange')!
const BLUE_POS   = TEST_POSITIONS.find(p => p.id === 'blue')!
const RED_POS    = TEST_POSITIONS.find(p => p.id === 'red')!
const YELLOW_POS = TEST_POSITIONS.find(p => p.id === 'yellow')!

const NEAR_GREEN  = { x: Math.round(GREEN_POS.x),  y: Math.round(GREEN_POS.y) }
const NEAR_VIOLET = { x: Math.round(VIOLET_POS.x), y: Math.round(VIOLET_POS.y) }
const NEAR_ORANGE = { x: Math.round(ORANGE_POS.x), y: Math.round(ORANGE_POS.y) }
const NEAR_BLUE   = { x: Math.round(BLUE_POS.x),   y: Math.round(BLUE_POS.y) }
const NEAR_RED    = { x: Math.round(RED_POS.x),     y: Math.round(RED_POS.y) }
const NEAR_YELLOW = { x: Math.round(YELLOW_POS.x),  y: Math.round(YELLOW_POS.y) }

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InputManager', () => {
  let manager: InputManager

  beforeEach(() => {
    manager = new InputManager(TEST_POSITIONS)
  })

  describe('press down (action: down)', () => {
    it('activates a left touch point and returns an AimCommand with dragOffsetX=0', () => {
      const cmds = manager.update([downEvent(1, NEAR_GREEN.x, NEAR_GREEN.y)])
      expect(cmds).toHaveLength(1)
      expect(cmds[0]).toMatchObject({ type: 'aim', touchPointId: 'green', dragOffsetX: 0 })
    })

    it('activates a right touch point and returns an AimCommand with dragOffsetX=0', () => {
      const cmds = manager.update([downEvent(1, NEAR_BLUE.x, NEAR_BLUE.y)])
      expect(cmds).toHaveLength(1)
      expect(cmds[0]).toMatchObject({ type: 'aim', touchPointId: 'blue', dragOffsetX: 0 })
    })

    it('maps near-violet position to violet', () => {
      const cmds = manager.update([downEvent(1, NEAR_VIOLET.x, NEAR_VIOLET.y)])
      expect(cmds[0]).toMatchObject({ type: 'aim', touchPointId: 'violet' })
    })

    it('maps near-orange position to orange', () => {
      const cmds = manager.update([downEvent(1, NEAR_ORANGE.x, NEAR_ORANGE.y)])
      expect(cmds[0]).toMatchObject({ type: 'aim', touchPointId: 'orange' })
    })

    it('maps near-red position to red', () => {
      const cmds = manager.update([downEvent(1, NEAR_RED.x, NEAR_RED.y)])
      expect(cmds[0]).toMatchObject({ type: 'aim', touchPointId: 'red' })
    })

    it('maps near-yellow position to yellow', () => {
      const cmds = manager.update([downEvent(1, NEAR_YELLOW.x, NEAR_YELLOW.y)])
      expect(cmds[0]).toMatchObject({ type: 'aim', touchPointId: 'yellow' })
    })
  })

  describe('drag (action: move)', () => {
    it('produces AimCommand with correct dragOffsetX after move', () => {
      manager.update([downEvent(1, NEAR_GREEN.x, NEAR_GREEN.y)])
      const cmds = manager.update([moveEvent(1, NEAR_GREEN.x + 30, NEAR_GREEN.y)])
      expect(cmds).toHaveLength(1)
      expect(cmds[0]).toMatchObject({ type: 'aim', touchPointId: 'green', dragOffsetX: 30 })
    })

    it('accumulates drag correctly over multiple moves', () => {
      manager.update([downEvent(1, NEAR_GREEN.x, NEAR_GREEN.y)])
      manager.update([moveEvent(1, NEAR_GREEN.x + 10, NEAR_GREEN.y)]) // +10
      const cmds = manager.update([moveEvent(1, NEAR_GREEN.x + 30, NEAR_GREEN.y)]) // total +30
      expect(cmds[0]).toMatchObject({ type: 'aim', dragOffsetX: 30 })
    })

    it('move without prior down produces no commands', () => {
      const cmds = manager.update([moveEvent(1, NEAR_GREEN.x, NEAR_GREEN.y)])
      expect(cmds).toHaveLength(0)
    })
  })

  describe('release (action: up)', () => {
    it('produces FireCommand with dragOffsetX at time of release', () => {
      manager.update([downEvent(1, NEAR_GREEN.x, NEAR_GREEN.y)])
      manager.update([moveEvent(1, NEAR_GREEN.x + 20, NEAR_GREEN.y)])
      const cmds = manager.update([upEvent(1, NEAR_GREEN.x + 20, NEAR_GREEN.y)])
      expect(cmds).toHaveLength(1)
      expect(cmds[0]).toMatchObject({ type: 'fire', touchPointId: 'green', dragOffsetX: 20 })
    })

    it('produces FireCommand with dragOffsetX=0 when released at origin', () => {
      manager.update([downEvent(1, NEAR_BLUE.x, NEAR_BLUE.y)])
      const cmds = manager.update([upEvent(1, NEAR_BLUE.x, NEAR_BLUE.y)])
      expect(cmds[0]).toMatchObject({ type: 'fire', touchPointId: 'blue', dragOffsetX: 0 })
    })

    it('up without prior down produces no commands', () => {
      const cmds = manager.update([upEvent(1, NEAR_GREEN.x, NEAR_GREEN.y)])
      expect(cmds).toHaveLength(0)
    })
  })

  describe(`${MAX_SIMULTANEOUS_TOUCHES} simultaneous pointers (game limit)`, () => {
    it(`handles ${MAX_SIMULTANEOUS_TOUCHES} simultaneous down events and produces ${MAX_SIMULTANEOUS_TOUCHES} AimCommands`, () => {
      const events: InputEvent[] = [
        downEvent(1, NEAR_GREEN.x, NEAR_GREEN.y),
        downEvent(2, NEAR_BLUE.x,  NEAR_BLUE.y),
      ]
      const cmds = manager.update(events)
      expect(cmds).toHaveLength(MAX_SIMULTANEOUS_TOUCHES)
      const ids = cmds.map(c => c.touchPointId)
      expect(ids).toContain('green')
      expect(ids).toContain('blue')
      cmds.forEach(c => expect(c.type).toBe('aim'))
    })

    it(`handles ${MAX_SIMULTANEOUS_TOUCHES} simultaneous up events and produces ${MAX_SIMULTANEOUS_TOUCHES} FireCommands`, () => {
      manager.update([
        downEvent(1, NEAR_GREEN.x, NEAR_GREEN.y),
        downEvent(2, NEAR_BLUE.x,  NEAR_BLUE.y),
      ])
      const cmds = manager.update([
        upEvent(1, NEAR_GREEN.x, NEAR_GREEN.y),
        upEvent(2, NEAR_BLUE.x,  NEAR_BLUE.y),
      ])
      expect(cmds).toHaveLength(MAX_SIMULTANEOUS_TOUCHES)
      cmds.forEach(c => expect(c.type).toBe('fire'))
    })

    it('independent pointers do not interfere with each other', () => {
      manager.update([
        downEvent(1, NEAR_GREEN.x, NEAR_GREEN.y),
        downEvent(2, NEAR_BLUE.x,  NEAR_BLUE.y),
      ])
      // Move only pointer 1
      manager.update([moveEvent(1, NEAR_GREEN.x + 15, NEAR_GREEN.y)])
      // Fire pointer 2 (no drag)
      const cmds = manager.update([upEvent(2, NEAR_BLUE.x, NEAR_BLUE.y)])
      expect(cmds).toHaveLength(1)
      expect(cmds[0]).toMatchObject({ type: 'fire', touchPointId: 'blue', dragOffsetX: 0 })
    })
  })

  describe('purity — reset() restores determinism', () => {
    it('reset() + same sequence produces same output', () => {
      const sequence: InputEvent[] = [
        downEvent(1, NEAR_GREEN.x, NEAR_GREEN.y),
        moveEvent(1, NEAR_GREEN.x + 25, NEAR_GREEN.y),
        upEvent(1, NEAR_GREEN.x + 25, NEAR_GREEN.y),
      ]

      // First run
      const first: GameCommand[] = []
      for (const e of sequence) first.push(...manager.update([e]))

      // Reset and replay
      manager.reset()
      const second: GameCommand[] = []
      for (const e of sequence) second.push(...manager.update([e]))

      expect(second).toEqual(first)
    })
  })

  describe(`max ${MAX_SIMULTANEOUS_TOUCHES} simultaneous touches enforcement`, () => {
    it('two simultaneous down events both produce AimCommands', () => {
      const cmds = manager.update([
        downEvent(1, NEAR_GREEN.x, NEAR_GREEN.y),
        downEvent(2, NEAR_BLUE.x, NEAR_BLUE.y),
      ])
      expect(cmds).toHaveLength(2)
      cmds.forEach(c => expect(c.type).toBe('aim'))
      const ids = cmds.map(c => c.touchPointId)
      expect(ids).toContain('green')
      expect(ids).toContain('blue')
    })

    it('third simultaneous pointer is ignored — only 2 AimCommands produced', () => {
      const cmds = manager.update([
        downEvent(1, NEAR_GREEN.x, NEAR_GREEN.y),
        downEvent(2, NEAR_BLUE.x, NEAR_BLUE.y),
        downEvent(3, NEAR_RED.x, NEAR_RED.y),
      ])
      // Only the first two pointers are accepted; the third is dropped
      expect(cmds).toHaveLength(MAX_SIMULTANEOUS_TOUCHES)
    })

    it('fourth pointer is also ignored when two are already active', () => {
      // Activate two pointers first
      manager.update([
        downEvent(1, NEAR_GREEN.x, NEAR_GREEN.y),
        downEvent(2, NEAR_BLUE.x, NEAR_BLUE.y),
      ])
      // Third pointer in a new frame — should be ignored
      const cmds = manager.update([downEvent(3, NEAR_RED.x, NEAR_RED.y)])
      expect(cmds).toHaveLength(0)
    })

    it('releasing one of two active pointers allows a new third pointer to be accepted', () => {
      manager.update([
        downEvent(1, NEAR_GREEN.x, NEAR_GREEN.y),
        downEvent(2, NEAR_BLUE.x, NEAR_BLUE.y),
      ])
      // Release pointer 1
      manager.update([upEvent(1, NEAR_GREEN.x, NEAR_GREEN.y)])
      // Now only one pointer active — new pointer 3 should be accepted
      const cmds = manager.update([downEvent(3, NEAR_RED.x, NEAR_RED.y)])
      expect(cmds).toHaveLength(1)
      expect(cmds[0]).toMatchObject({ type: 'aim', touchPointId: 'red' })
    })

    it('two independent pointers maintain separate drag states', () => {
      manager.update([
        downEvent(1, NEAR_GREEN.x, NEAR_GREEN.y),
        downEvent(2, NEAR_BLUE.x, NEAR_BLUE.y),
      ])
      // Move only pointer 1 by 40px
      manager.update([moveEvent(1, NEAR_GREEN.x + 40, NEAR_GREEN.y)])
      // Release pointer 2 — dragOffsetX should be 0 (never moved)
      const cmds = manager.update([upEvent(2, NEAR_BLUE.x, NEAR_BLUE.y)])
      expect(cmds).toHaveLength(1)
      expect(cmds[0]).toMatchObject({ type: 'fire', touchPointId: 'blue', dragOffsetX: 0 })
    })

    it('two simultaneous up events after two downs produce two FireCommands', () => {
      manager.update([
        downEvent(1, NEAR_GREEN.x, NEAR_GREEN.y),
        downEvent(2, NEAR_BLUE.x, NEAR_BLUE.y),
      ])
      const cmds = manager.update([
        upEvent(1, NEAR_GREEN.x, NEAR_GREEN.y),
        upEvent(2, NEAR_BLUE.x, NEAR_BLUE.y),
      ])
      expect(cmds).toHaveLength(2)
      cmds.forEach(c => expect(c.type).toBe('fire'))
      const ids = cmds.map(c => c.touchPointId)
      expect(ids).toContain('green')
      expect(ids).toContain('blue')
    })
  })
})
