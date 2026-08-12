import { test, expect } from '@playwright/test'

const TEST_EMAIL = 'teacher1@example.com'
const TEST_PASSWORD = 'password123'

test('login and access attendance page', async ({ page, baseURL }) => {
  await page.goto('/')

  // Redirect to login when not authenticated
  await expect(page).toHaveURL(/\/login$/)

  await page.fill('#email', TEST_EMAIL)
  await page.fill('#password', TEST_PASSWORD)
  await page.click('button[type="submit"]')

  await page.waitForURL('/')
  await expect(page.locator('h1')).toHaveText('Dashboard')

  await page.click('button:has-text("View attendance page")')
  await page.waitForURL('/attendance')
  await expect(page.locator('h1')).toHaveText('Attendance')

  await page.click('button:has-text("Refresh")')
  await expect(page.locator('.rounded-2xl.bg-amber-50').first()).not.toBeVisible({ timeout: 3000 })
})
