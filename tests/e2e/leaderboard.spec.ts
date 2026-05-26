// tests/e2e/leaderboard.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Leaderboard', () => {
  test('shows leaderboard list', async ({ page }) => {
    await page.goto('/leaderboard')
    await expect(page.getByTestId('leaderboard-list')).toBeVisible()
  })

  test('clicking 오늘의 러닝 opens modal', async ({ page }) => {
    await page.goto('/leaderboard')
    const btn = page.getByRole('button', { name: '오늘의 러닝' }).first()
    await expect(btn).toBeVisible()
    await btn.click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('leaderboard link navigates to home', async ({ page }) => {
    await page.goto('/leaderboard')
    await page.getByRole('link', { name: '홈으로' }).click()
    await expect(page).toHaveURL('/')
  })
})
