import { test, expect } from '@playwright/test'
import { gameApi } from '../helpers/gameApi'

// iPhone 14 portrait
test.use({ viewport: { width: 390, height: 844 } })

async function waitForBridge(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(
    () => (window as unknown as Record<string, unknown>)['__game'] !== undefined,
    { timeout: 5000 },
  )
}

// AC#5: HP bar element is visible after battle start
test('HP bar element visible after battle start', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)

  const api = gameApi(page)
  await api.startBattle()

  const hpFill = page.locator('#hud-hp-fill')
  await expect(hpFill).toBeVisible()

  // HP bar should have positive width (100% at start)
  const box = await hpFill.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeGreaterThan(0)
})

// AC#6: HP bar width decreases after a confirmed hit (deterministic via applyHit bridge)
test('HP bar width decreases after a confirmed hit', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)

  const api = gameApi(page)
  await api.startBattle()

  // Wait for HUD to render the initial state (100% HP)
  await page.waitForTimeout(100)

  const hpFill = page.locator('#hud-hp-fill')
  await expect(hpFill).toBeVisible()

  // At battle start: HP bar should be at 100%
  const initialStyle = await hpFill.getAttribute('style')
  expect(initialStyle).toContain('width: 100%')

  // Apply a guaranteed HIT directly via the test bridge (deterministic)
  await api.applyHit('HIT', 'slow_shot')

  // Wait for the Phaser game loop to run and update the DOM
  await page.waitForTimeout(100)

  const state = await api.getState()
  expect(state.enemyHp).toBeLessThan(state.enemyMaxHp)

  // Verify HP bar fill decreased
  const updatedStyle = await hpFill.getAttribute('style')
  expect(updatedStyle).toContain('width:')
  const match = updatedStyle?.match(/width:\s*([\d.]+)%/)
  expect(match).not.toBeNull()
  const fillPct = parseFloat(match![1])
  const expectedPct = (state.enemyHp / state.enemyMaxHp) * 100
  expect(fillPct).toBeCloseTo(expectedPct, 0)
  expect(fillPct).toBeLessThan(100)
})

// AC#7: enemy name text matches level 1 enemy name
test('enemy name matches level 1 enemy (Goblin Scout)', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)

  const api = gameApi(page)
  await api.startBattle()

  // Allow HUD to update from first frame
  await page.waitForTimeout(100)

  const enemyNameEl = page.locator('#hud-enemy-name')
  await expect(enemyNameEl).toBeVisible()

  const text = await enemyNameEl.textContent()
  expect(text?.trim().toLowerCase()).toBe('goblin scout')
})
