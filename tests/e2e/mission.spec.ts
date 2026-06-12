import { test, expect } from '@playwright/test'

test.describe('Mission page', () => {
  test.beforeEach(async ({ page }) => {
    // assumes test user is logged in via persisted state in playwright.config.ts
    await page.goto('/mission')
  })

  test('shows empty state when no challenge exists', async ({ page }) => {
    // skip this test in env where a seeded challenge exists
    test.skip(!!process.env.E2E_HAS_CHALLENGE, 'seeded challenge present')
    await expect(page.getByText(/진행 중인 챌린지가 없|곧/)).toBeVisible()
  })

  test('renders board when enrolled', async ({ page }) => {
    test.skip(!process.env.E2E_HAS_CHALLENGE, 'no seeded challenge')
    await expect(page.locator('[data-state]')).toHaveCount(100)
  })

  test('increments count on +10 click when today is in season', async ({ page }) => {
    test.skip(!process.env.E2E_HAS_CHALLENGE, 'no seeded challenge')
    const initialCountText = await page.locator('text=/^\\d+$/').first().textContent()
    const initial = Number(initialCountText ?? 0)
    await page.getByRole('button', { name: '+10' }).click()
    await expect(page.locator('text=/^\\d+$/').first()).toHaveText(String(initial + 10), { timeout: 2000 })
  })
})
