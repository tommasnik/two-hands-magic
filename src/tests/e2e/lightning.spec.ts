import { test, expect } from '@playwright/test'
import { gameApi } from '../helpers/gameApi'

test.use({ viewport: { width: 390, height: 844 } })

async function waitForBridge(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(
    () => (window as unknown as Record<string, unknown>)['__game'] !== undefined,
    { timeout: 5000 },
  )
}

test('instant hit: enemy HP decreases immediately on lightning_blast release', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)
  const api = gameApi(page)
  await api.startBattle()
  const stateBefore = await api.getState()
  const hpBefore = stateBefore.enemyHp

  await api.fireLightningBlast('HIT')

  const stateAfter = await api.getState()
  expect(stateAfter.enemyHp).toBeLessThan(hpBefore)
})

test('MISS: enemy HP does not decrease on lightning_blast MISS', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)
  const api = gameApi(page)
  await api.startBattle()
  const stateBefore = await api.getState()
  const hpBefore = stateBefore.enemyHp

  await api.fireLightningBlast('MISS')

  const stateAfter = await api.getState()
  expect(stateAfter.enemyHp).toBe(hpBefore)
})
