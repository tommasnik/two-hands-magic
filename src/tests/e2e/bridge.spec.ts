import { test, expect } from '@playwright/test'
import { gameApi } from '../helpers/gameApi'

test('getState returns a valid game state', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await page.waitForFunction(
    () => (window as unknown as Record<string, unknown>)['__game'] !== undefined,
    { timeout: 5000 },
  )
  const api = gameApi(page)
  const state = await api.getState()
  expect(state).not.toBeNull()
  expect(['loading', 'battle', 'game_over']).toContain(state.phase)
})

test('injectInput registers touch and reflects in state', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await page.waitForFunction(
    () => (window as unknown as Record<string, unknown>)['__game'] !== undefined,
    { timeout: 5000 },
  )
  const api = gameApi(page)
  await api.startBattle()

  await api.injectInput({ pointerId: 0, action: 'down', x: 50, y: 800, timestamp: Date.now() })
  // Advance time so the queued input is processed
  await api.advanceTime(16)
  const state = await api.getState()
  expect(state).not.toBeNull()
  expect(state.phase).toBe('battle')
})
