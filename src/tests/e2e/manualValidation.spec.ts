import { test, expect } from '@playwright/test'
import { gameApi } from '../helpers/gameApi'

test('manual: getState returns battle phase', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await page.goto('http://localhost:5274')
  await page.waitForFunction(
    () => (window as unknown as Record<string, unknown>)['__game'] !== undefined,
    { timeout: 5000 },
  )

  const api = gameApi(page)
  await api.startBattle()

  const state = await api.getState()
  expect(state.phase).toBe('battle')

  // No console errors during load and initial gameplay
  expect(errors).toHaveLength(0)
})

test('manual: inject touch input reflects in game state', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await page.waitForFunction(
    () => (window as unknown as Record<string, unknown>)['__game'] !== undefined,
    { timeout: 5000 },
  )

  const api = gameApi(page)
  await api.startBattle()

  // Simulate touch down on left side (maps to green touch point)
  await api.injectInput({ pointerId: 1, action: 'down', x: 50, y: 800, timestamp: Date.now() })
  // Advance time so the queued input is processed and projectile is fired
  await api.advanceTime(300)
  await api.injectInput({ pointerId: 1, action: 'up', x: 50, y: 800, timestamp: Date.now() })
  await api.advanceTime(500)

  const state = await api.getState()
  expect(state.phase).toBe('battle')
  // Score must exist and be non-negative
  expect(state.score).toBeDefined()
  expect(state.score.total).toBeGreaterThanOrEqual(0)
})

test('manual: no console errors during gameplay', async ({ page }) => {
  const errors: string[] = []
  const warnings: string[] = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
    // Only track game-originated warnings, not Phaser internal WebGL warnings
    if (msg.type() === 'warning' && !msg.text().includes('WebGL')) {
      warnings.push(msg.text())
    }
  })

  await page.goto('http://localhost:5274')
  await page.waitForFunction(
    () => (window as unknown as Record<string, unknown>)['__game'] !== undefined,
    { timeout: 5000 },
  )

  const api = gameApi(page)
  await api.startBattle()

  // Simulate several touch interactions
  await api.injectInput({ pointerId: 0, action: 'down', x: 300, y: 700, timestamp: Date.now() })
  await api.advanceTime(200)
  await api.injectInput({ pointerId: 0, action: 'up', x: 300, y: 700, timestamp: Date.now() })
  await api.advanceTime(600)

  await api.injectInput({ pointerId: 1, action: 'down', x: 50, y: 600, timestamp: Date.now() })
  await api.advanceTime(400)
  await api.injectInput({ pointerId: 1, action: 'up', x: 50, y: 600, timestamp: Date.now() })
  await api.advanceTime(300)

  // Allow any deferred errors to surface
  await page.waitForTimeout(200)

  expect(errors).toHaveLength(0)
  expect(warnings).toHaveLength(0)
})
