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
  // Use CRITs with slow_shot (highest damage: 20 * 2 = 40) to minimise iterations
  // Max 20 iterations covers Titan Lord (500 HP / 40 = 12.5 → 13 shots)
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

  // Verify level 1 starts with Goblin Scout
  const initialState = await api.getState()
  expect(initialState.currentLevel).toBe(1)
  expect(initialState.enemyName.toLowerCase()).toContain('goblin')

  // Drain level 1 enemy HP → phase transitions to level_complete
  await drainEnemyHp(api)

  const afterLevel1 = await api.getState()
  expect(afterLevel1.phase).toBe('level_complete')
  expect(afterLevel1.enemyHp).toBe(0)

  // Advance to level 2 — confirm the pending level-up first, then call nextLevel()
  await api.confirmLevelUpUpgrade()
  await api.nextLevel()
  await page.waitForTimeout(50)

  const level2State = await api.getState()
  expect(level2State.currentLevel).toBe(2)
  // Level 2 enemy is Orc Warrior
  expect(level2State.enemyName.toLowerCase()).toContain('orc')
  expect(level2State.phase).toBe('battle')
  // HP fully restored for new enemy
  expect(level2State.enemyHp).toBe(level2State.enemyMaxHp)
  expect(level2State.enemyHp).toBeGreaterThan(0)

  // DOM HUD should reflect the new enemy name
  await page.waitForTimeout(100)
  const enemyNameEl = page.locator('#hud-enemy-name')
  const hudText = await enemyNameEl.textContent()
  expect(hudText?.toLowerCase()).toContain('orc')
})

// AC#6: 'victory' phase reached after the last level enemy is defeated
// (The campaign has 18 levels; we advance through all of them quickly via the test bridge)
test('AC#6: victory phase reached after all levels are completed', async ({ page }) => {
  test.setTimeout(120_000) // 18-level loop takes ~30–60 s in headless browser
  await page.goto('http://localhost:5274')
  await waitForBridge(page)

  const api = gameApi(page)
  await api.startBattle()

  // Fast-forward through the 18-level campaign using the test bridge
  // Level 1 is already started; drain and advance through levels 1–17, then drain level 18 → victory
  const TOTAL_LEVELS = 18
  for (let lvl = 1; lvl <= TOTAL_LEVELS; lvl++) {
    let state = await api.getState()
    expect(state.currentLevel).toBe(lvl)
    expect(state.phase).toBe('battle')

    // Drain this level's enemy HP
    await drainEnemyHp(api)
    state = await api.getState()
    expect(state.enemyHp).toBe(0)

    if (lvl < TOTAL_LEVELS) {
      // Intermediate level → level_complete, then advance
      expect(state.phase).toBe('level_complete')
      await api.confirmLevelUpUpgrade()
      await api.nextLevel()
    } else {
      // Final level → victory
      expect(state.phase).toBe('victory')
    }
  }
})

// AC#7: Only 1 touch point visible per side initially (not 3)
test('AC#7: only 1 touch point per side in initial layout', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)

  const api = gameApi(page)
  // Check before battle start (loading phase)
  const loadingState = await api.getState()
  expect(loadingState.touchPointsPerSide.left).toBe(1)
  expect(loadingState.touchPointsPerSide.right).toBe(1)

  // Also verify after battle starts
  await api.startBattle()
  const battleState = await api.getState()
  expect(battleState.touchPointsPerSide.left).toBe(1)
  expect(battleState.touchPointsPerSide.right).toBe(1)
})

// AC#7 (task-31): After killing the goblin, game doesn't freeze and shows new enemy
test('AC#7: after killing goblin, game transitions to new enemy without freezing', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)

  const api = gameApi(page)
  await api.startBattle()

  // Kill the goblin
  await drainEnemyHp(api)
  const afterKill = await api.getState()
  expect(afterKill.phase).toBe('level_complete')
  expect(afterKill.enemyHp).toBe(0)

  // Advance to level 2 — clear the level-up pick gate first, then nextLevel()
  await api.confirmLevelUpUpgrade()
  await api.nextLevel()
  await page.waitForTimeout(100)

  // Game must be in battle phase (not frozen/stuck)
  const level2State = await api.getState()
  expect(level2State.phase).toBe('battle')
  expect(level2State.currentLevel).toBe(2)

  // New enemy must be shown with full HP
  expect(level2State.enemyHp).toBeGreaterThan(0)
  expect(level2State.enemyHp).toBe(level2State.enemyMaxHp)
  expect(level2State.enemyName.toLowerCase()).toContain('orc')

  // HUD must display the new enemy name
  await page.waitForTimeout(50)
  const hudName = await page.locator('#hud-enemy-name').textContent()
  expect(hudName?.toLowerCase()).toContain('orc')

  // HUD must display the new level number
  const hudLevel = await page.locator('#hud-level').textContent()
  expect(hudLevel).toContain('2')

  // Game must be interactive — fire a shot without throwing
  await api.applyHit('HIT', 'slow_shot')
  const afterHit = await api.getState()
  expect(afterHit.enemyHp).toBeLessThan(afterHit.enemyMaxHp)
})
