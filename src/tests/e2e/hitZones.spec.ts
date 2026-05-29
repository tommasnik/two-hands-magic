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

// AC#5: enemy has no colored zones before first hit
// The game state's lastHit should be null before any hit — indicating no flash has occurred
test('AC#5: lastHit is null before first hit — no zone flash active', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)

  const api = gameApi(page)
  await api.startBattle()

  // Wait for a render frame
  await page.waitForTimeout(100)

  const state = await api.getState()
  expect(state.phase).toBe('battle')
  // No hit has occurred yet — lastHit must be null (means no zone flash initiated)
  expect(state.lastHit).toBeNull()
})

// AC#6: after a hit, the struck zone is recorded in lastHit.hitZone
test('AC#6: after a hit, the struck zone is recorded in lastHit.hitZone', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)

  const api = gameApi(page)
  await api.startBattle()

  // Apply a direct HIT to the torso via the test bridge
  await api.applyHit('HIT', 'slow_shot')

  // Wait for one render frame
  await page.waitForTimeout(100)

  const state = await api.getState()
  expect(state.lastHit).not.toBeNull()
  // hitZone must be 'none' when applied via _applyHitForTesting (no position known)
  // but the field must exist and be a valid zone string
  const validZones = ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'none']
  expect(validZones).toContain(state.lastHit?.hitZone)
})

// AC#6 extended: after a real projectile hit, hitZone matches the result
test('AC#6 extended: projectile hit records consistent hitZone matching result', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await waitForBridge(page)

  const api = gameApi(page)
  await api.startBattle()
  await page.waitForTimeout(100)

  // Aim at enemy torso centre: use left_0 slot (slow_shot, period=2200ms)
  // Torso is at GAME_HEIGHT/3 ≈ 281 px. period=2200ms → phase=1-281/844≈0.667 → t≈1467ms
  // Use 1500ms for comfortable margin inside the torso zone.
  // Get actual rendered position to match InputManager routing
  const positions = await api.getTouchPointPositions()
  const left0Pos = positions.find(p => p.id === 'left_0')!
  const touchX = Math.round(left0Pos.x)
  const touchY = Math.round(left0Pos.y)

  await api.injectInput({ pointerId: 0, action: 'down', x: touchX, y: touchY, timestamp: 0 })
  // Advance to ~1500ms to aim at torso Y
  await api.advanceTime(1500)
  await api.injectInput({ pointerId: 0, action: 'up', x: touchX, y: touchY, timestamp: 1500 })
  // Advance to let the projectile arrive
  await api.advanceTime(2000)

  const state = await api.getState()
  expect(state.lastHit).not.toBeNull()

  // hitZone must be a valid zone name
  const validZones = ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'none']
  expect(validZones).toContain(state.lastHit?.hitZone)

  // hitZone must be consistent with the hit result:
  // CRIT → head, HIT → torso, GRAZE → arm or leg, MISS → none
  const { result, hitZone } = state.lastHit!
  if (result === 'CRIT') {
    expect(hitZone).toBe('head')
  } else if (result === 'HIT') {
    expect(hitZone).toBe('torso')
  } else if (result === 'GRAZE') {
    expect(['leftArm', 'rightArm', 'leftLeg', 'rightLeg']).toContain(hitZone)
  } else if (result === 'MISS') {
    expect(hitZone).toBe('none')
  }
})
