import { randomUUID } from 'node:crypto'
import type { Page } from '@playwright/test'
import { expect, test } from './support/fixtures'

function switcher(page: Page) {
  return page.getByTestId('sidebar-shelf-switcher')
}

async function createShelf(page: Page, name: string) {
  await page.getByTestId('shelf-name').fill(name)
  await page.getByTestId('new-shelf-submit').click()
  await expect(switcher(page)).toHaveText(`Shelf: ${name}`)
}

test('opens on your own shelf', async ({ page, member }) => {
  await page.goto('/')

  await expect(page).toHaveURL(
    new RegExp(`/shelves/[a-z0-9-]*${member.shelfId}$`),
  )
  await expect(switcher(page)).toHaveText("Shelf: Tess's shelf")
})

test('creates a shelf and comes back to it next time', async ({
  page,
  member,
}) => {
  await page.goto('/')

  await switcher(page).click()
  await page.getByTestId('shelf-menu-new').click()
  await createShelf(page, 'Work')

  await expect(page).not.toHaveURL(/\/shelves\/new$/)
  const workPath = new URL(page.url()).pathname
  expect(workPath).not.toBe(`/shelves/${member.shelfId}`)

  await page.goto('/')

  await expect(page).toHaveURL(workPath)
})

test('switches to the same page on another shelf', async ({ page, member }) => {
  await page.goto('/shelves/new')
  await createShelf(page, 'Work')
  await page.getByTestId('sidebar-link').filter({ hasText: 'Library' }).click()
  await expect(page).toHaveURL(/\/library$/)

  await switcher(page).click()
  await page
    .getByTestId('shelf-menu-shelf')
    .filter({ hasText: "Tess's shelf" })
    .click()

  await expect(page).toHaveURL(
    new RegExp(`/shelves/[a-z0-9-]*${member.shelfId}/library$`),
  )
})

test('explains a shelf without a name', async ({ page }) => {
  await page.goto('/shelves/new')

  await page.getByTestId('new-shelf-submit').click()

  await expect(page.getByTestId('new-shelf-form')).toContainText(
    'Give the shelf a name',
  )
})

test('keeps people out of shelves they are not a member of', async ({
  page,
}) => {
  await page.goto(`/shelves/${randomUUID()}`)

  await expect(page.getByTestId('error-title')).toHaveText('Not found')
})

test('keeps the navigation on a page that does not exist', async ({
  page,
  member,
}) => {
  await page.goto(`/shelves/${member.shelfId}`)
  await page.goto('/this-page-does-not-exist')

  await expect(page.getByTestId('error-message')).toHaveText(
    "That page doesn't exist or you don't have access to it.",
  )
  await expect(page.getByText('/this-page-does-not-exist')).toHaveCount(0)
  await expect(page.getByTestId('sidebar')).toBeVisible()
})
