// tests/e2e/home.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Home Feed', () => {
  test('shows run feed on home page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('run-feed')).toBeVisible()
  })

  test('clicking a run card opens detail sheet', async ({ page }) => {
    await page.goto('/')
    const feed = page.getByTestId('run-feed')
    await expect(feed).toBeVisible()

    const cards = feed.locator('button')
    const count = await cards.count()
    if (count === 0) {
      test.skip()
      return
    }

    await cards.first().click()
    await expect(page.getByTestId('detail-sheet')).toBeVisible()
  })

  test('closing detail sheet hides it', async ({ page }) => {
    await page.goto('/')
    const cards = page.getByTestId('run-feed').locator('button')
    if (await cards.count() === 0) { test.skip(); return }

    await cards.first().click()
    await page.getByTestId('detail-sheet-backdrop').click({ position: { x: 100, y: 100 } })
    await page.waitForTimeout(400)
    await expect(page.getByTestId('detail-sheet')).not.toBeVisible()
  })
})
