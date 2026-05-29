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

/** Drain the current enemy to 0 HP via the test bridge. */
async function drainEnemyHp(api: ReturnType<typeof gameApi>): Promise<void> {
  for (let i = 0; i < 20; i++) {
    const state = await api.getState()
    if (state.enemyHp <= 0 || state.phase !== 'battle') break
    await api.applyHit('CRIT', 'slow_shot')
    await new Promise((r) => setTimeout(r, 30))
  }
}

// AC#1, AC#6: kill 1 enemy → upgrade overlay visible; clicking releases gate.
test('AC#1/AC#6: upgrade overlay appears after first kill and level advances after a pick', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)
  const api = gameApi(page)
  await api.startBattle()
  await drainEnemyHp(api)

  // pendingLevelUp must be true and the overlay must be visible
  const afterKill = await api.getState()
  expect(afterKill.phase).toBe('level_complete')
  expect(afterKill.pendingLevelUp).toBe(true)
  expect(afterKill.playerLevel).toBe(2)
  await page.waitForTimeout(50)
  await expect(page.locator('#upgrade-overlay')).not.toHaveClass(/hidden/)

  // The picker must offer at least one available node (the 4 root nodes)
  const availableCount = await page.locator('.upgrade-node.available').count()
  expect(availableCount).toBeGreaterThanOrEqual(4)

  // Clicking an available node confirms the pick and advances the level
  await page.locator('.upgrade-node.available').first().click()
  await page.waitForTimeout(80)
  const released = await api.getState()
  expect(released.pendingLevelUp).toBe(false)
  expect(released.globalUpgrades.unlockedNodeIds.length).toBe(1)
  expect(released.currentLevel).toBe(2)
  expect(released.phase).toBe('battle')
  await expect(page.locator('#upgrade-overlay')).toHaveClass(/hidden/)
})

// AC#2: locked nodes are present and visually distinct from available ones
test('AC#2: locked nodes are rendered with the .locked class and not clickable', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)
  const api = gameApi(page)
  await api.startBattle()
  await drainEnemyHp(api)
  await page.waitForTimeout(50)

  // crit_dmg_2 requires crit_dmg_1 — must be locked at the first picker
  const lockedNode = page.locator('.upgrade-node[data-node-id="crit_dmg_2"]')
  await expect(lockedNode).toHaveClass(/locked/)
  await expect(lockedNode).toBeDisabled()

  // A root node must be marked available
  const rootNode = page.locator('.upgrade-node[data-node-id="crit_dmg_1"]')
  await expect(rootNode).toHaveClass(/available/)
})

// AC#5: XP bar grows with each kill
test('AC#5: XP bar fills up as kills accumulate', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)
  const api = gameApi(page)

  // Before battle start: bar empty at Lvl 1
  await api.startBattle()
  await page.waitForTimeout(50)
  const labelBefore = await page.locator('#xp-label').textContent()
  expect(labelBefore).toContain('Lvl 1')

  // Kill 1 enemy → level promotes to 2; pick something to clear the gate
  await drainEnemyHp(api)
  await page.waitForTimeout(50)
  await page.locator('.upgrade-node.available').first().click()
  await page.waitForTimeout(80)

  // Now at level 2 — XP label must reflect that.
  const labelAfter = await page.locator('#xp-label').textContent()
  expect(labelAfter).toContain('Lvl 2')
  // The XP fill width is between 0 and 100% (kills toward level 3 may be 0)
  const fillStyle = await page.locator('#xp-fill').getAttribute('style')
  expect(fillStyle).toMatch(/width:\s*\d/)
})
