import { test, expect, type Page } from '@playwright/test'
import { gameApi } from '../helpers/gameApi'
import type { BehaviorGraph } from '../../types'

test.use({ viewport: { width: 390, height: 844 } })

const ICE_CRYSTAL_FREEZE_HIT_MS = 1000
const ICE_CRYSTAL_FREEZE_CRIT_MS = 2000

async function waitForBridge(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as unknown as Record<string, unknown>)['__game'] !== undefined,
    { timeout: 5000 },
  )
}

test('freeze on HIT: enemyFrozenUntilMs > 0', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)
  const api = gameApi(page)
  await api.startBattle()
  await api.applyHit('HIT', 'ice_crystal')
  const state = await api.getState()
  expect(state.enemyFrozenUntilMs).toBeGreaterThan(0)
})

test('freeze on CRIT: enemyFrozenUntilMs >= ICE_CRYSTAL_FREEZE_CRIT_MS', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)
  const api = gameApi(page)
  await api.startBattle()
  await api.applyHit('CRIT', 'ice_crystal')
  const state = await api.getState()
  expect(state.enemyFrozenUntilMs).toBeGreaterThanOrEqual(ICE_CRYSTAL_FREEZE_CRIT_MS)
})

test('no freeze on GRAZE: enemyFrozenUntilMs === 0', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)
  const api = gameApi(page)
  await api.startBattle()
  await api.applyHit('GRAZE', 'ice_crystal')
  const state = await api.getState()
  expect(state.enemyFrozenUntilMs).toBe(0)
})

test('behavior runner stops during freeze: no new deliveries spawned while frozen', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)
  const api = gameApi(page)
  await api.startBattle()

  // Install a fast-cycling orb graph: idle 50ms → attack 100ms (release on frame 0) → repeat
  const fastGraph: BehaviorGraph = {
    start: 'idle',
    nodes: {
      idle: {
        id: 'idle',
        animKey: 'idle',
        exitTrigger: { kind: 'afterMs', ms: 50 },
        edges: [{ to: 'attack', weight: 1 }],
      },
      attack: {
        id: 'attack',
        animKey: 'attack',
        exitTrigger: { kind: 'afterMs', ms: 100 },
        attack: {
          damage: 1,
          releaseFrame: 0,
          kind: 'orb',
          visualKey: 'orb_default',
          projectileSpeedCmS: 50,
          castPoint: { dx: 0, dy: -50 },
        },
        edges: [{ to: 'idle', weight: 1 }],
      },
    },
  }
  await api.installBehaviorGraph(fastGraph)

  // Advance 300ms — the runner cycles (idle 50ms + attack 100ms = 150ms per cycle)
  // so ~2 delivery spawns before we freeze
  await api.advanceTime(300)

  // Freeze with ice_crystal HIT (freeze duration = 1000ms)
  await api.applyHit('HIT', 'ice_crystal')
  const stateAtFreeze = await api.getState()
  const deliveriesAtFreeze = stateAtFreeze.activeDeliveries.length

  // Verify the enemy is actually frozen
  expect(stateAtFreeze.enemyFrozenUntilMs).toBeGreaterThan(stateAtFreeze.elapsedMs)

  // Advance 500ms — still within the 1000ms freeze window, runner must not tick
  await api.advanceTime(500)
  const stateAfter = await api.getState()

  // Deliveries can only expire/connect while frozen — count must not increase
  expect(stateAfter.activeDeliveries.length).toBeLessThanOrEqual(deliveriesAtFreeze)
  // Enemy must still be frozen
  expect(stateAfter.enemyFrozenUntilMs).toBeGreaterThan(stateAfter.elapsedMs)
})

test('freeze expires after ICE_CRYSTAL_FREEZE_HIT_MS', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)
  const api = gameApi(page)
  await api.startBattle()
  await api.applyHit('HIT', 'ice_crystal')

  // Advance past the freeze window
  await api.advanceTime(ICE_CRYSTAL_FREEZE_HIT_MS + 100)
  const state = await api.getState()

  // elapsedMs is now past enemyFrozenUntilMs → enemy is no longer frozen
  expect(state.enemyFrozenUntilMs).toBeLessThanOrEqual(state.elapsedMs)
})
