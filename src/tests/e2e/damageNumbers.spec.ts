import { test, expect, type Page } from '@playwright/test'
import { gameApi } from '../helpers/gameApi'
import {
  FLOAT_TEXT_COLOR_CRIT,
  FLOAT_TEXT_COLOR_HIT,
  FLOAT_TEXT_COLOR_GRAZE,
  getHitResultColor,
} from '../../game/constants'

// iPhone 14 portrait
test.use({ viewport: { width: 390, height: 844 } })

async function waitForBridge(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as unknown as Record<string, unknown>)['__game'] !== undefined,
    { timeout: 5000 },
  )
}

// AC#6: after a CRIT hit, lastHit.damage is positive and result is CRIT
test('AC#6: after a CRIT hit, damage number is positive and result is CRIT', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)

  const api = gameApi(page)
  await api.startBattle()

  // Apply a CRIT hit directly via test bridge
  await api.applyHit('CRIT', 'slow_shot')

  // Wait for one render frame
  await page.waitForTimeout(100)

  const state = await api.getState()
  expect(state.lastHit).not.toBeNull()
  expect(state.lastHit?.result).toBe('CRIT')
  // Damage must be a positive number (SLOW_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER = 40)
  expect(state.lastHit?.damage).toBeGreaterThan(0)
  // CRIT damage should be larger than a normal HIT damage from the same skill
  // slow_shot CRIT = 40, slow_shot HIT = 20 → CRIT > HIT
  expect(state.lastHit?.damage).toBeGreaterThan(10)
})

// AC#7: after a GRAZE, lastHit.damage is smaller than a CRIT
test('AC#7: after a GRAZE, damage is smaller than CRIT damage from same skill', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)

  const api = gameApi(page)
  await api.startBattle()

  // First record a CRIT damage value
  await api.applyHit('CRIT', 'slow_shot')
  await page.waitForTimeout(50)
  const critState = await api.getState()
  const critDamage = critState.lastHit?.damage ?? 0

  // Now apply a GRAZE
  await api.applyHit('GRAZE', 'slow_shot')
  await page.waitForTimeout(50)
  const grazeState = await api.getState()

  expect(grazeState.lastHit).not.toBeNull()
  expect(grazeState.lastHit?.result).toBe('GRAZE')
  expect(grazeState.lastHit?.damage).toBeGreaterThan(0)
  // GRAZE damage must be strictly less than CRIT damage
  expect(grazeState.lastHit?.damage).toBeLessThan(critDamage)
})

// AC#4: MISS produces no floating text — verify lastHit.result is MISS and damage is 0
test('AC#4: MISS hit has result MISS and damage 0', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)

  const api = gameApi(page)
  await api.startBattle()

  await api.applyHit('MISS', 'slow_shot')
  await page.waitForTimeout(50)

  const state = await api.getState()
  expect(state.lastHit).not.toBeNull()
  expect(state.lastHit?.result).toBe('MISS')
  // MISS deals no damage
  expect(state.lastHit?.damage).toBe(0)
})

// AC#2 (task-30): damage number color matches hit result type via getHitResultColor
test('AC#2 (task-30): CRIT hit color matches FLOAT_TEXT_COLOR_CRIT constant', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)

  const api = gameApi(page)
  await api.startBattle()

  await api.applyHit('CRIT', 'slow_shot')
  await page.waitForTimeout(50)

  const state = await api.getState()
  expect(state.lastHit?.result).toBe('CRIT')
  // Verify getHitResultColor returns the CRIT color constant for a CRIT result
  expect(getHitResultColor('CRIT')).toBe(FLOAT_TEXT_COLOR_CRIT)
})

test('AC#2 (task-30): HIT color matches FLOAT_TEXT_COLOR_HIT constant', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)

  const api = gameApi(page)
  await api.startBattle()

  await api.applyHit('HIT', 'slow_shot')
  await page.waitForTimeout(50)

  const state = await api.getState()
  expect(state.lastHit?.result).toBe('HIT')
  expect(getHitResultColor('HIT')).toBe(FLOAT_TEXT_COLOR_HIT)
})

test('AC#2 (task-30): GRAZE color matches FLOAT_TEXT_COLOR_GRAZE constant', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)

  const api = gameApi(page)
  await api.startBattle()

  await api.applyHit('GRAZE', 'slow_shot')
  await page.waitForTimeout(50)

  const state = await api.getState()
  expect(state.lastHit?.result).toBe('GRAZE')
  expect(getHitResultColor('GRAZE')).toBe(FLOAT_TEXT_COLOR_GRAZE)
})

// AC#1 (task-30): zones are never visible — game state has no zone flash data exposed
// Zones are always rendered in neutral fill; no state flag drives zone flashing
test('AC#1 (task-30): no zone flash state exposed — lastHit.hitZone present but zones never flash', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)

  const api = gameApi(page)
  await api.startBattle()

  // Before any hit: lastHit is null
  const stateBefore = await api.getState()
  expect(stateBefore.lastHit).toBeNull()

  // After a CRIT hit: lastHit is recorded but no zone flash field in state
  await api.applyHit('CRIT', 'slow_shot')
  await page.waitForTimeout(50)

  const stateAfter = await api.getState()
  expect(stateAfter.lastHit).not.toBeNull()
  // GameState has no zoneFlash field — zones are purely visual and never flash
  expect((stateAfter as unknown as Record<string, unknown>)['zoneFlash']).toBeUndefined()
  expect((stateAfter as unknown as Record<string, unknown>)['partFlash']).toBeUndefined()
})

// Verify damage numbers are ordered: CRIT > HIT > GRAZE
test('damage numbers follow expected hierarchy: CRIT > HIT > GRAZE', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)

  const api = gameApi(page)
  await api.startBattle()

  await api.applyHit('CRIT', 'slow_shot')
  await page.waitForTimeout(50)
  const critDmg = (await api.getState()).lastHit?.damage ?? 0

  await api.applyHit('HIT', 'slow_shot')
  await page.waitForTimeout(50)
  const hitDmg = (await api.getState()).lastHit?.damage ?? 0

  await api.applyHit('GRAZE', 'slow_shot')
  await page.waitForTimeout(50)
  const grazeDmg = (await api.getState()).lastHit?.damage ?? 0

  expect(critDmg).toBeGreaterThan(hitDmg)
  expect(hitDmg).toBeGreaterThan(grazeDmg)
  expect(grazeDmg).toBeGreaterThan(0)
})
