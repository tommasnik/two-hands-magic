import { test, expect } from '@playwright/test'
import { gameApi } from '../helpers/gameApi'

test.use({ viewport: { width: 390, height: 844 } })

const LIGHTNING_BLAST_DURATION_CRIT_MS = 600
const LIGHTNING_BLAST_DURATION_HIT_MS = 300

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

test('discharge state: lightningDischargeUntilMs > 0 after lightning_blast', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)
  const api = gameApi(page)
  await api.startBattle()

  await api.fireLightningBlast('HIT')

  const state = await api.getState()
  expect(state.lightningDischargeUntilMs).toBeGreaterThan(0)
  expect(state.lightningDischargeResult).toBe('HIT')
  expect(state.lightningDischargeTarget).not.toBeNull()
})

test('CRIT discharge: lightningDischargeUntilMs set to CRIT duration', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)
  const api = gameApi(page)
  await api.startBattle()

  await api.fireLightningBlast('CRIT')

  const state = await api.getState()
  // CRIT discharge must last at least LIGHTNING_BLAST_DURATION_CRIT_MS from now
  expect(state.lightningDischargeUntilMs).toBeGreaterThanOrEqual(
    state.elapsedMs + LIGHTNING_BLAST_DURATION_CRIT_MS,
  )
  expect(state.lightningDischargeResult).toBe('CRIT')
  // CRIT discharge must be longer than HIT discharge
  expect(state.lightningDischargeUntilMs - state.elapsedMs).toBeGreaterThan(LIGHTNING_BLAST_DURATION_HIT_MS)
})

test('discharge expires after LIGHTNING_BLAST_DURATION_CRIT_MS', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)
  const api = gameApi(page)
  await api.startBattle()

  await api.fireLightningBlast('CRIT')

  // Advance past the CRIT discharge window
  await api.advanceTime(LIGHTNING_BLAST_DURATION_CRIT_MS + 100)
  const state = await api.getState()

  // lightningDischargeUntilMs is in the past — visual discharge is over
  expect(state.lightningDischargeUntilMs).toBeLessThanOrEqual(state.elapsedMs)
})
