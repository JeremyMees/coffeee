import { expect, test } from './support/fixtures'
import { smallPhone } from './support/touch'

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(smallPhone)
})

test('never scrolls sideways on a 320px phone', async ({ page, member }) => {
  for (const path of [
    `/shelves/${member.shelfId}`,
    `/shelves/${member.shelfId}/library`,
    `/shelves/${member.shelfId}/discover`,
    `/shelves/${member.shelfId}/settings`,
    '/roasters',
    '/profile',
  ]) {
    await page.goto(path)
    await expect(page.getByTestId('dock')).toBeVisible()

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    )
    expect(overflow, path).toBe(0)
  }
})

test('fits every dock button on a 320px phone', async ({ page, member }) => {
  await page.goto(`/shelves/${member.shelfId}`)

  const buttons = page
    .getByTestId('dock')
    .locator('[data-testid="dock-link"], [data-testid="dock-add"]')
  await expect(buttons).toHaveCount(6)

  for (const button of await buttons.all()) {
    const box = (await button.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(smallPhone.width)
  }
})
