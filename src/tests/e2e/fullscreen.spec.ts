import { test, expect } from '@playwright/test'

/**
 * Fullscreen E2E tests — TASK-28
 *
 * AC#4: Verify that clicking Start triggers requestFullscreen().
 *
 * Note: In headless Playwright, document.fullscreenElement is always null
 * because browsers do not grant fullscreen without a real user gesture in a
 * visible window. We therefore spy on requestFullscreen and verify it was
 * called instead of checking the element directly.
 */

test.use({ viewport: { width: 390, height: 844 } })

test('clicking Start calls requestFullscreen on documentElement', async ({ page }) => {
  // Inject a spy before the page runs any scripts
  await page.addInitScript(() => {
    const original = HTMLElement.prototype.requestFullscreen
    HTMLElement.prototype.requestFullscreen = function (...args) {
      ;(window as unknown as Record<string, unknown>)['__fullscreenCalled'] = true
      // Call original if present — may throw in headless, that's fine
      if (original) {
        return original.apply(this, args).catch(() => Promise.resolve())
      }
      return Promise.resolve()
    }
    ;(window as unknown as Record<string, unknown>)['__fullscreenCalled'] = false
  })

  await page.goto('http://localhost:5274')
  await page.waitForSelector('#start-btn', { timeout: 5000 })

  // Click Start button
  await page.click('#start-btn')

  // Give async requestFullscreen promise a tick to resolve/reject
  await page.waitForTimeout(100)

  const called = await page.evaluate(
    () => (window as unknown as Record<string, unknown>)['__fullscreenCalled'],
  )
  expect(called).toBe(true)
})

test('game continues normally if fullscreen is denied', async ({ page }) => {
  // Simulate fullscreen being denied
  await page.addInitScript(() => {
    HTMLElement.prototype.requestFullscreen = function () {
      return Promise.reject(new Error('fullscreen denied'))
    }
  })

  await page.goto('http://localhost:5274')
  await page.waitForFunction(
    () => (window as unknown as Record<string, unknown>)['__game'] !== undefined,
    { timeout: 5000 },
  )

  // Click Start — should NOT throw
  await page.click('#start-btn')
  await page.waitForTimeout(200)

  // Game state should be 'battle' — game continues normally
  const phase = await page.evaluate(
    () =>
      (
        window as unknown as Record<string, { getState: () => { phase: string } }>
      )['__game'].getState().phase,
  )
  expect(phase).toBe('battle')
})
