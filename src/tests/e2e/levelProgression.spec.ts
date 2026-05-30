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

/**
 * Drain the current enemy to 0 HP using repeated CRIT hits via the test bridge.
 * Uses slow_shot CRIT (40 damage) — up to 20 iterations to handle all enemy HP pools.
 */
async function drainEnemyHp(
  api: ReturnType<typeof gameApi>,
): Promise<void> {
  for (let i = 0; i < 20; i++) {
    const state = await api.getState()
    if (state.enemyHp <= 0 || state.phase !== 'battle') break
    await api.applyHit('CRIT', 'slow_shot')
    await new Promise(r => setTimeout(r, 50))
  }
}

// AC#5: Level 2 enemy name appears after level 1 is complete
test('AC#5: Level 2 enemy name appears after level 1 complete', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)

  const api = gameApi(page)
  await api.startBattle()

  // Verify level 1 starts with Stone Giant (ENEMY_POOL[0])
  const initialState = await api.getState()
  expect(initialState.currentLevel).toBe(1)
  expect(initialState.enemyName.toLowerCase()).toContain('stone')

  // Drain level 1 enemy HP → phase transitions to fight_overview
  await drainEnemyHp(api)

  const afterLevel1 = await api.getState()
  expect(afterLevel1.phase).toBe('fight_overview')
  expect(afterLevel1.enemyHp).toBe(0)

  // Confirm pending level-up, then advance to level 2
  await api.confirmLevelUpUpgrade()
  await api.completeFightOverview()
  await page.waitForTimeout(50)

  const level2State = await api.getState()
  expect(level2State.currentLevel).toBe(2)
  // Level 2 enemy is Plague Rat (ENEMY_POOL[1])
  expect(level2State.enemyName.toLowerCase()).toContain('plague')
  expect(level2State.phase).toBe('battle')
  // HP fully restored for new enemy
  expect(level2State.enemyHp).toBe(level2State.enemyMaxHp)
  expect(level2State.enemyHp).toBeGreaterThan(0)

  // DOM HUD should reflect the new enemy name
  await page.waitForTimeout(100)
  const enemyNameEl = page.locator('#hud-enemy-name')
  const hudText = await enemyNameEl.textContent()
  expect(hudText?.toLowerCase()).toContain('plague')
})

// AC#6: fight_overview phase reached after the last level enemy is defeated
test('AC#6: campaign completes after all 6 levels', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('http://localhost:5274')
  await waitForBridge(page)

  const api = gameApi(page)
  await api.startBattle()

  const TOTAL_LEVELS = 6
  for (let lvl = 1; lvl <= TOTAL_LEVELS; lvl++) {
    let state = await api.getState()
    expect(state.currentLevel).toBe(lvl)
    expect(state.phase).toBe('battle')

    // Drain this level's enemy HP
    await drainEnemyHp(api)
    state = await api.getState()
    expect(state.enemyHp).toBe(0)
    expect(state.phase).toBe('fight_overview')

    if (lvl < TOTAL_LEVELS) {
      // Intermediate level → confirm upgrade + advance
      await api.confirmLevelUpUpgrade()
      await api.completeFightOverview()
    }
    // Last level: fight_overview is the terminal state for the run
  }
})

// AC#7 (task-31): After killing the first enemy, game transitions to next without freezing
test('AC#7: after killing first enemy, game transitions to new enemy without freezing', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)

  const api = gameApi(page)
  await api.startBattle()

  // Kill the first enemy
  await drainEnemyHp(api)
  const afterKill = await api.getState()
  expect(afterKill.phase).toBe('fight_overview')
  expect(afterKill.enemyHp).toBe(0)

  // Advance to level 2
  await api.confirmLevelUpUpgrade()
  await api.completeFightOverview()
  await page.waitForTimeout(100)

  // Game must be in battle phase (not frozen/stuck)
  const level2State = await api.getState()
  expect(level2State.phase).toBe('battle')
  expect(level2State.currentLevel).toBe(2)

  // New enemy must be shown with full HP
  expect(level2State.enemyHp).toBeGreaterThan(0)
  expect(level2State.enemyHp).toBe(level2State.enemyMaxHp)
  expect(level2State.enemyName.toLowerCase()).toContain('plague')

  // HUD must display the new enemy name
  await page.waitForTimeout(50)
  const hudName = await page.locator('#hud-enemy-name').textContent()
  expect(hudName?.toLowerCase()).toContain('plague')

  // HUD must display the new level number
  const hudLevel = await page.locator('#hud-level').textContent()
  expect(hudLevel).toContain('2')

  // Game must be interactive — fire a shot without throwing
  await api.applyHit('HIT', 'slow_shot')
  const afterHit = await api.getState()
  expect(afterHit.enemyHp).toBeLessThan(afterHit.enemyMaxHp)
})
