import type { Page } from '@playwright/test'
import { expect, test, uniqueName } from './support/fixtures'

function daysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

async function addCoffee(
  page: Page,
  coffee: { name: string; roaster: string; newRoaster: boolean },
) {
  await page
    .getByRole('main')
    .getByRole('button', { name: 'Add coffee' })
    .click()

  const sheet = page.getByRole('dialog', { name: 'Add coffee' })
  await sheet.getByLabel('Coffee').fill(coffee.name)
  await sheet.getByRole('combobox', { name: 'Roaster' }).fill(coffee.roaster)
  await page
    .getByRole('option', {
      name: coffee.newRoaster ? `Add “${coffee.roaster}”` : coffee.roaster,
    })
    .click()
  await sheet.getByText('Light', { exact: true }).click()
  await sheet.getByText('Filter', { exact: true }).click()
  await sheet.getByLabel('Roasted on').fill(daysAgo(10))
  await sheet.getByLabel('Size (g)').fill('250')
  await sheet.getByLabel('Price (€)').fill('16.50')
  await sheet.getByRole('button', { name: 'Add coffee' }).click()

  await expect(sheet).toBeHidden()
}

test('adds a coffee with its first bag and shows it in Stock', async ({
  page,
  member,
}) => {
  const roaster = uniqueName('Roaster')
  await page.goto(`/shelves/${member.shelfId}`)

  await addCoffee(page, { name: 'Ayele Fulasa', roaster, newRoaster: true })

  const card = page
    .getByRole('list', { name: 'Current stock' })
    .getByRole('link', { name: /Ayele Fulasa/ })
  await expect(card).toContainText(roaster)
  await expect(card).toContainText('Light · Filter')
  await expect(card).toContainText('10')
  await expect(card).toContainText('Peak')

  await card.click()

  await expect(
    page.getByRole('heading', { level: 1, name: 'Ayele Fulasa' }),
  ).toBeVisible()
  await expect(page.getByText('250 g · €16.50')).toBeVisible()
})

test('adds a purchase instead of a duplicate when the coffee exists', async ({
  page,
  member,
}) => {
  const roaster = uniqueName('Roaster')
  await page.goto(`/shelves/${member.shelfId}`)

  await addCoffee(page, { name: 'Ayele Fulasa', roaster, newRoaster: true })
  await addCoffee(page, {
    name: 'ayele-fulasa',
    roaster: roaster.toUpperCase(),
    newRoaster: false,
  })

  const stock = page.getByRole('list', { name: 'Current stock' })
  await expect(stock.getByRole('listitem')).toHaveCount(1)

  await stock.getByRole('link').click()

  await expect(page.getByText('In stock')).toHaveCount(2)
})

test('explains missing details and clears them once fixed', async ({
  page,
  member,
}) => {
  await page.goto(`/shelves/${member.shelfId}`)
  await page
    .getByRole('main')
    .getByRole('button', { name: 'Add coffee' })
    .click()
  const sheet = page.getByRole('dialog', { name: 'Add coffee' })

  await sheet.getByRole('button', { name: 'Add coffee' }).click()

  await expect(sheet.getByText('Give the coffee a name')).toBeVisible()
  await expect(sheet.getByText('Pick a roast level')).toBeVisible()

  await sheet.getByLabel('Coffee').fill('Halo')
  await sheet.getByText('Light', { exact: true }).click()

  await expect(sheet.getByText('Give the coffee a name')).toBeHidden()
  await expect(sheet.getByText('Pick a roast level')).toBeHidden()
  await expect(sheet.getByText('Pick a roaster or add a new one')).toBeVisible()
})
