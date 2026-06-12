import { test, expect } from '@playwright/test'

test.describe('Announcement → mission flow', () => {
  test('clicking banner leads to mission page', async ({ page }) => {
    test.skip(!process.env.E2E_HAS_UPCOMING_CHALLENGE, 'no seeded upcoming challenge')
    await page.goto('/home')
    await page.locator('text=NEW SEASON').click()
    await expect(page).toHaveURL(/\/mission/)
  })

  test('enrolling from mission updates banner to "참가 중"', async ({ page }) => {
    test.skip(!process.env.E2E_HAS_UPCOMING_CHALLENGE, 'no seeded upcoming challenge')
    await page.goto('/mission')
    await page.getByText('참가 신청').click()
    await page.goto('/home')
    await expect(page.getByText('참가 중')).toBeVisible()
  })
})
