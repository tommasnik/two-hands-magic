import { test, expect } from '@playwright/test'

test('game canvas renders without errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await page.goto('http://localhost:5274')

  // Wait for the canvas element to appear
  await page.waitForSelector('canvas', { timeout: 5000 })

  // Canvas must be visible
  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()

  // Allow a moment for any deferred errors to surface
  await page.waitForTimeout(1000)

  expect(errors).toHaveLength(0)
})

test('game canvas has correct dimensions', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await page.waitForSelector('canvas', { timeout: 5000 })

  const canvas = page.locator('canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  // Canvas must have positive dimensions
  expect(box!.width).toBeGreaterThan(0)
  expect(box!.height).toBeGreaterThan(0)
})

test('enemy torso centre Y is in upper 40% of canvas', async ({ page }) => {
  await page.goto('http://localhost:5274')

  // Wait for test bridge
  await page.waitForFunction(
    () => (window as unknown as Record<string, unknown>)['__game'] !== undefined,
    { timeout: 5000 },
  )

  // Start battle so enemy is active
  await page.evaluate(
    () => (window as unknown as Record<string, { startBattle: () => void }>)['__game'].startBattle(),
  )

  const result = await page.evaluate(() => {
    const game = (window as unknown as Record<string, { getState: () => { enemy: { y: number }; } }>)['__game']
    const state = game.getState()
    const GAME_HEIGHT = 844
    const threshold = GAME_HEIGHT * 0.4
    return { enemyY: state.enemy.y, threshold, gameHeight: GAME_HEIGHT }
  })

  // Enemy torso centre must be in upper 40% (y < GAME_HEIGHT * 0.4)
  expect(result.enemyY).toBeLessThan(result.threshold)
  // Also must be positive (not off-screen above)
  expect(result.enemyY).toBeGreaterThan(0)
})

test('window.__game.getState() is consistent after rendering', async ({ page }) => {
  await page.goto('http://localhost:5274')

  // Wait for test bridge
  await page.waitForFunction(
    () => (window as unknown as Record<string, unknown>)['__game'] !== undefined,
    { timeout: 5000 },
  )

  // Start battle programmatically
  await page.evaluate(
    () => (window as unknown as Record<string, { startBattle: () => void }>)['__game'].startBattle(),
  )

  // Let at least one render frame occur
  await page.waitForTimeout(100)

  const state = await page.evaluate(
    () =>
      (
        window as unknown as Record<string, { getState: () => Record<string, unknown> }>
      )['__game'].getState(),
  )

  expect(state.phase).toBe('battle')
  expect(state.score).toBeDefined()
  expect(state.enemy).toBeDefined()
  expect(Array.isArray(state.activeProjectiles)).toBe(true)
  expect(state.touchStates).toBeDefined()
})
