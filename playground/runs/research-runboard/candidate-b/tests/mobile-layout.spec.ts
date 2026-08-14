import { expect, test } from '@playwright/test'

test('390px runboard has no page overflow and preserves critical context', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Every run, in focus.' })).toBeVisible()
  await expect(page.getByText('Maya Chen').first()).toBeVisible()
  await expect(page.getByText('44 min ago')).toBeVisible()
  await expect(page.getByText('Electronic convergence stalled after 180 steps.')).toBeVisible()
  await expect(page.getByText('Failed', { exact: true }).first()).toBeVisible()

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }))
  expect(dimensions).toEqual({ viewport: 390, document: 390 })
})
