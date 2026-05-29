import { test, expect } from '@playwright/test'

// iPhone 14 profil: 390×844 viewport
test.use({ viewport: { width: 390, height: 844 } })

test('canvas is visible in portrait mode', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await page.waitForSelector('canvas', { timeout: 5000 })
  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()

  // Canvas má pozitivní rozměry
  const box = await canvas.boundingBox()
  expect(box?.width).toBeGreaterThan(0)
  expect(box?.height).toBeGreaterThan(0)
})

test('landscape overlay is hidden in portrait mode', async ({ page }) => {
  await page.goto('http://localhost:5274')
  const overlay = page.locator('#landscape-overlay')
  // V portrait módu overlay nesmí být visible
  await expect(overlay).toHaveCSS('display', 'none')
})

test('no horizontal overflow', async ({ page }) => {
  await page.goto('http://localhost:5274')
  await page.waitForSelector('canvas', { timeout: 5000 })
  // Document width nesmí být větší než viewport
  const docWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(docWidth).toBeLessThanOrEqual(390)
})
