import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

export const phone = { width: 390, height: 844 }
export const smallPhone = { width: 320, height: 640 }
export const desktop = { width: 1440, height: 900 }

export function hitArea(locator: Locator) {
  return locator.evaluate(element => {
    const box = element.getBoundingClientRect()
    const before = getComputedStyle(element, '::before')

    if (before.position !== 'absolute') {
      return { width: box.width, height: box.height }
    }

    const reach = (side: string) => Math.max(0, -parseFloat(side))

    return {
      width: box.width + reach(before.left) + reach(before.right),
      height: box.height + reach(before.top) + reach(before.bottom),
    }
  })
}

export async function expectTouchable(locator: Locator) {
  await expect(locator).toBeVisible()
  const area = await hitArea(locator)
  const name = (await locator.getAttribute('data-testid')) ?? 'control'

  expect(area.width, name).toBeGreaterThanOrEqual(44)
  expect(area.height, name).toBeGreaterThanOrEqual(44)
}

export async function onPhone(page: Page) {
  await page.setViewportSize(phone)
  await page.goto(page.url())
}
