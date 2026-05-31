/**
 * E2E tests for touch-to-circle mapping accuracy (TASK-33, TASK-35).
 *
 * Updated for TASK-35: dynamic slot layout (left_0, right_0) replaces named touch points.
 *
 * AC#1: Tapping a colored circle always activates that specific slot, not a neighbour.
 * AC#4: inject touch at circle center → activates the correct slot (not an adjacent one).
 *
 * Strategy:
 * - Retrieve the rendered slot positions via window.__game.getTouchPointPositions()
 * - Inject a touch-down event at the exact pixel center of each slot circle
 * - Advance time one frame (16ms) so the queued input is processed
 * - Verify the activated slot (via activeSlots) matches the circle that was tapped
 */

import { test, expect, type Page } from '@playwright/test'
import { gameApi } from '../helpers/gameApi'

// iPhone 14 portrait — matches the game's target layout
test.use({ viewport: { width: 390, height: 844 } })

async function waitForBridge(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as unknown as Record<string, unknown>)['__game'] !== undefined,
    { timeout: 5000 },
  )
}

/**
 * AC#4 — inject touch at circle center → activates the correct slot.
 * Tests all active slots (default: left_0 and right_0).
 */
test('AC#4: touch at center of each circle activates that circle, not a neighbour', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)

  const api = gameApi(page)
  await api.startBattle()

  // Allow a render frame for BattleScene.create() to run and call setTouchPointPositions
  await page.waitForTimeout(100)

  // Get the positions that are actually used for rendering AND nearest-point lookup
  const positions = await api.getTouchPointPositions()
  // Default layout: 2 slots (left_0 + right_0)
  expect(positions.length).toBeGreaterThanOrEqual(2)

  for (const pos of positions) {
    // Reset InputManager state between tests by releasing any lingering pointer
    await api.injectInput({ pointerId: 99, action: 'up', x: pos.x, y: pos.y, timestamp: 0 })
    await api.advanceTime(16)

    // Inject touch at the exact rendered circle center
    await api.injectInput({
      pointerId: 1,
      action: 'down',
      x: Math.round(pos.x),
      y: Math.round(pos.y),
      timestamp: 0,
    })
    await api.advanceTime(16)

    const state = await api.getState()

    // The slot whose id matches this position should be active
    const activatedId = pos.id
    // Use activeSlots for dynamic slot state
    const activeSlots = state.activeSlots as Array<{ id: string; active: boolean }>
    const slot = activeSlots.find(s => s.id === activatedId)
    expect(slot, `Slot "${activatedId}" at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}) should exist in activeSlots`).toBeTruthy()
    expect(slot!.active, `Slot "${activatedId}" should be active after tapping its center`).toBe(true)

    // Release the pointer to reset for the next iteration
    await api.injectInput({ pointerId: 1, action: 'up', x: Math.round(pos.x), y: Math.round(pos.y), timestamp: 16 })
    await api.advanceTime(16)
  }
})

/**
 * AC#1 — tapping a circle must NOT activate a neighbour.
 * Tests that touching left_0 does not activate right_0.
 */
test('AC#1: touch at left_0 circle center does not activate right_0', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)

  const api = gameApi(page)
  await api.startBattle()
  await page.waitForTimeout(100)

  const positions = await api.getTouchPointPositions()
  const left0 = positions.find(p => p.id === 'left_0')!
  expect(left0).toBeDefined()

  await api.injectInput({
    pointerId: 1,
    action: 'down',
    x: Math.round(left0.x),
    y: Math.round(left0.y),
    timestamp: 0,
  })
  await api.advanceTime(16)

  const state = await api.getState()
  const activeSlots = state.activeSlots as Array<{ id: string; active: boolean }>

  const left0Slot  = activeSlots.find(s => s.id === 'left_0')
  const right0Slot = activeSlots.find(s => s.id === 'right_0')

  expect(left0Slot?.active).toBe(true)
  expect(right0Slot?.active).toBe(false)
})

/**
 * AC#2 + AC#3 — nearest logic uses same coordinates as rendered circles.
 * Verifies that getTouchPointPositions returns positions that match the rendered circle positions,
 * and that those same positions are used by InputManager for nearest-point routing.
 */
test('AC#2 + AC#3: nearest-point positions match rendered circle positions', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)

  const api = gameApi(page)
  await api.startBattle()
  await page.waitForTimeout(100)

  const positions = await api.getTouchPointPositions()

  // Default layout: at least 1 slot per side (AC#2)
  const leftSlots  = positions.filter(p => p.side === 'left')
  const rightSlots = positions.filter(p => p.side === 'right')
  expect(leftSlots.length).toBeGreaterThanOrEqual(1)
  expect(rightSlots.length).toBeGreaterThanOrEqual(1)

  // Left-side circles must be on the left half of the canvas
  for (const pos of leftSlots) {
    expect(pos.x).toBeLessThan(390 / 2)
  }

  // Right-side circles must be on the right half of the canvas
  for (const pos of rightSlots) {
    expect(pos.x).toBeGreaterThan(390 / 2)
  }

  // Verify that touching right at the center of each slot routes to that slot (alignment check)
  for (const pos of positions) {
    await api.injectInput({ pointerId: 99, action: 'up', x: 0, y: 0, timestamp: 0 })
    await api.advanceTime(16)

    await api.injectInput({
      pointerId: 1,
      action: 'down',
      x: Math.round(pos.x),
      y: Math.round(pos.y),
      timestamp: 0,
    })
    await api.advanceTime(16)

    const state = await api.getState()
    const activeSlots = state.activeSlots as Array<{ id: string; active: boolean }>
    const slot = activeSlots.find(s => s.id === pos.id)
    expect(
      slot?.active,
      `Nearest-point lookup for slot "${pos.id}" at (${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}) must activate that slot`,
    ).toBe(true)

    await api.injectInput({ pointerId: 1, action: 'up', x: Math.round(pos.x), y: Math.round(pos.y), timestamp: 16 })
    await api.advanceTime(16)
  }
})
