import { randomUUID } from 'node:crypto'
import { expect, test } from './support/fixtures'

test('opens on your own shelf', async ({ page, member }) => {
  await page.goto('/')

  await expect(page).toHaveURL(`/shelves/${member.shelfId}`)
  await expect(
    page.getByRole('button', { name: "Shelf: Tess's shelf" }),
  ).toBeVisible()
})

test('creates a shelf and comes back to it next time', async ({
  page,
  member,
}) => {
  await page.goto('/')

  await page.getByRole('button', { name: "Shelf: Tess's shelf" }).click()
  await page.getByRole('menuitem', { name: 'New shelf' }).click()
  await page.getByLabel('Name').fill('Work')
  await page.getByRole('button', { name: 'Create shelf' }).click()

  await expect(page.getByRole('button', { name: 'Shelf: Work' })).toBeVisible()
  await expect(page).not.toHaveURL(/\/shelves\/new$/)
  const workPath = new URL(page.url()).pathname
  expect(workPath).not.toBe(`/shelves/${member.shelfId}`)

  await page.goto('/')

  await expect(page).toHaveURL(workPath)
})

test('switches to the same page on another shelf', async ({ page, member }) => {
  await page.goto('/shelves/new')
  await page.getByLabel('Name').fill('Work')
  await page.getByRole('button', { name: 'Create shelf' }).click()
  await expect(page.getByRole('button', { name: 'Shelf: Work' })).toBeVisible()
  await page.getByRole('link', { name: 'Library' }).click()
  await expect(page).toHaveURL(/\/library$/)

  await page.getByRole('button', { name: 'Shelf: Work' }).click()
  await page.getByRole('menuitem', { name: "Tess's shelf" }).click()

  await expect(page).toHaveURL(`/shelves/${member.shelfId}/library`)
})

test('explains a shelf without a name', async ({ page }) => {
  await page.goto('/shelves/new')

  await page.getByRole('button', { name: 'Create shelf' }).click()

  await expect(page.getByText('Give the shelf a name')).toBeVisible()
})

test('keeps people out of shelves they are not a member of', async ({
  page,
}) => {
  await page.goto(`/shelves/${randomUUID()}`)

  await expect(page.getByRole('heading', { name: 'Not found' })).toBeVisible()
})
