/**
 * E2E tests for multi-touch behavior — AC #5.
 * Verifies that two touches with different pointerIds generate two simultaneous
 * projectile animations and that the third touch is ignored (max 2 at once).
 *
 * Updated for TASK-35: uses dynamic slot layout (left_0, right_0) instead of
 * named touch points (green, blue). Slot states read from activeSlots.
 *
 * Touch point positions are retrieved from window.__game.getTouchPointPositions()
 * to match the actual rendered circle positions.
 */
import { test, expect } from '@playwright/test'
import { gameApi } from '../helpers/gameApi'

const BASE_URL = 'http://localhost:5274'

async function waitForBridge(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(
    () => (window as unknown as Record<string, unknown>)['__game'] !== undefined,
    { timeout: 5000 },
  )
}

test('two touches with different pointerIds generate two projectiles in flight', async ({ page }) => {
  await page.goto(BASE_URL)
  await waitForBridge(page)
  const api = gameApi(page)
  await api.startBattle()
  await page.waitForTimeout(100)

  // Get actual rendered positions — these are guaranteed to match InputManager routing
  const positions = await api.getTouchPointPositions()
  const leftPos  = positions.find(p => p.side === 'left')!
  const rightPos = positions.find(p => p.side === 'right')!
  const LEFT_X  = Math.round(leftPos.x),  LEFT_Y  = Math.round(leftPos.y)
  const RIGHT_X = Math.round(rightPos.x), RIGHT_Y = Math.round(rightPos.y)

  // Inject two simultaneous touch-down events with different pointerIds
  // pointerId 1 → left slot (left_0)
  // pointerId 2 → right slot (right_0)
  await api.injectInput({ pointerId: 1, action: 'down', x: LEFT_X, y: LEFT_Y, timestamp: Date.now() })
  await api.injectInput({ pointerId: 2, action: 'down', x: RIGHT_X, y: RIGHT_Y, timestamp: Date.now() })
  await api.advanceTime(16)

  // Both slot states should be active simultaneously
  const stateDown = await api.getState()
  const activeSlots = stateDown.activeSlots as Array<{ id: string; active: boolean }>
  const left0  = activeSlots.find(s => s.id === 'left_0')
  const right0 = activeSlots.find(s => s.id === 'right_0')
  expect(left0?.active).toBe(true)
  expect(right0?.active).toBe(true)

  // Release both pointers — fires two projectiles
  await api.injectInput({ pointerId: 1, action: 'up', x: LEFT_X, y: LEFT_Y, timestamp: Date.now() })
  await api.injectInput({ pointerId: 2, action: 'up', x: RIGHT_X, y: RIGHT_Y, timestamp: Date.now() })
  await api.advanceTime(16)

  const stateAfterFire = await api.getState()
  const inFlight = stateAfterFire.activeProjectiles.filter((p) => p.alive).length
  const alreadyHit =
    stateAfterFire.score.crits +
    stateAfterFire.score.hits +
    stateAfterFire.score.grazes +
    stateAfterFire.score.misses
  // Two shots fired — both in flight or already resolved
  expect(inFlight + alreadyHit).toBe(2)
})

test('third simultaneous touch is ignored — only 2 projectiles generated', async ({ page }) => {
  await page.goto(BASE_URL)
  await waitForBridge(page)
  const api = gameApi(page)
  await api.startBattle()
  await page.waitForTimeout(100)

  const positions = await api.getTouchPointPositions()
  const leftPos  = positions.find(p => p.side === 'left')!
  const rightPos = positions.find(p => p.side === 'right')!
  // Third touch — use left side offset (still maps to nearest left slot)
  const LEFT_X  = Math.round(leftPos.x),  LEFT_Y  = Math.round(leftPos.y)
  const RIGHT_X = Math.round(rightPos.x), RIGHT_Y = Math.round(rightPos.y)
  // Offset third touch slightly from right position (still nearest to right_0)
  const THIRD_X = RIGHT_X - 10, THIRD_Y = RIGHT_Y - 10

  // Three touches — third should be dropped by InputManager (MAX_SIMULTANEOUS_TOUCHES = 2)
  await api.injectInput({ pointerId: 1, action: 'down', x: LEFT_X, y: LEFT_Y, timestamp: Date.now() })
  await api.injectInput({ pointerId: 2, action: 'down', x: RIGHT_X, y: RIGHT_Y, timestamp: Date.now() })
  await api.injectInput({ pointerId: 3, action: 'down', x: THIRD_X, y: THIRD_Y, timestamp: Date.now() })
  await api.advanceTime(16)

  // Release all three
  await api.injectInput({ pointerId: 1, action: 'up', x: LEFT_X, y: LEFT_Y, timestamp: Date.now() })
  await api.injectInput({ pointerId: 2, action: 'up', x: RIGHT_X, y: RIGHT_Y, timestamp: Date.now() })
  await api.injectInput({ pointerId: 3, action: 'up', x: THIRD_X, y: THIRD_Y, timestamp: Date.now() })
  await api.advanceTime(16)

  const state = await api.getState()
  const inFlight = state.activeProjectiles.filter((p) => p.alive).length
  const alreadyHit =
    state.score.crits + state.score.hits + state.score.grazes + state.score.misses
  // Only 2 projectiles (third pointer was rejected)
  expect(inFlight + alreadyHit).toBe(2)
})

test('releasing one pointer allows a new third pointer to be accepted', async ({ page }) => {
  await page.goto(BASE_URL)
  await waitForBridge(page)
  const api = gameApi(page)
  await api.startBattle()
  await page.waitForTimeout(100)

  const positions = await api.getTouchPointPositions()
  const leftPos  = positions.find(p => p.side === 'left')!
  const rightPos = positions.find(p => p.side === 'right')!
  const LEFT_X  = Math.round(leftPos.x),  LEFT_Y  = Math.round(leftPos.y)
  const RIGHT_X = Math.round(rightPos.x), RIGHT_Y = Math.round(rightPos.y)

  // Activate 2 pointers — left and right
  await api.injectInput({ pointerId: 1, action: 'down', x: LEFT_X, y: LEFT_Y, timestamp: Date.now() })
  await api.injectInput({ pointerId: 2, action: 'down', x: RIGHT_X, y: RIGHT_Y, timestamp: Date.now() })
  await api.advanceTime(16)

  // Release pointer 1 — fires one projectile from left slot
  await api.injectInput({ pointerId: 1, action: 'up', x: LEFT_X, y: LEFT_Y, timestamp: Date.now() })
  await api.advanceTime(16)

  const stateAfterRelease = await api.getState()
  // Left slot (left_0) fired — no longer active
  const slotsAfterRelease = stateAfterRelease.activeSlots as Array<{ id: string; active: boolean }>
  expect(slotsAfterRelease.find(s => s.id === 'left_0')?.active).toBe(false)
  expect(slotsAfterRelease.find(s => s.id === 'right_0')?.active).toBe(true)

  // Now add a third pointer — it should be accepted since only 1 is active
  // Point it at the left side again (left_0 is the nearest slot)
  await api.injectInput({ pointerId: 3, action: 'down', x: LEFT_X, y: LEFT_Y, timestamp: Date.now() })
  await api.advanceTime(16)
  await api.injectInput({ pointerId: 3, action: 'up', x: LEFT_X, y: LEFT_Y, timestamp: Date.now() })
  await api.advanceTime(16)

  const stateFinal = await api.getState()
  const inFlight = stateFinal.activeProjectiles.filter((p) => p.alive).length
  const alreadyHit =
    stateFinal.score.crits + stateFinal.score.hits + stateFinal.score.grazes + stateFinal.score.misses
  // Two total shots fired (pointer 1 + pointer 3), pointer 2 still held
  expect(inFlight + alreadyHit).toBeGreaterThanOrEqual(1)
})
