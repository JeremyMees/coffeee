import { randomUUID } from 'node:crypto'
import type { Locator, Page } from '@playwright/test'
import { expect, test, uniqueName } from './support/fixtures'

function daysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

async function choose(sheet: Locator, group: string, option: string) {
  const radio = sheet.getByTestId(group).getByTestId(option)

  await radio.locator('xpath=..').click()
  await expect(radio).toBeChecked()
}

async function pickDate(page: Page, picker: string, isoDate: string) {
  await page.getByTestId(picker).getByTestId('date-picker-trigger').click()

  const calendar = page.getByTestId('date-picker-calendar')
  const day = calendar.locator(
    `[data-value="${isoDate}"]:not([data-outside-view])`,
  )

  while (!(await day.isVisible())) {
    await calendar.locator('[data-slot="calendar-prev-button"]').click()
  }

  await day.click()
}

async function pickRoaster(page: Page, name: string, isNew: boolean) {
  await page.getByTestId('coffee-roaster').fill(name)
  await page
    .getByTestId(isNew ? 'roaster-option-new' : 'roaster-option')
    .filter({ hasText: name })
    .first()
    .click()
}

async function addCoffee(
  page: Page,
  coffee: { name: string; roaster: string; newRoaster: boolean },
) {
  await page.getByTestId('page-add-coffee').click()

  const sheet = page.getByTestId('add-coffee-sheet')
  await sheet.getByTestId('coffee-name').fill(coffee.name)
  await pickRoaster(page, coffee.roaster, coffee.newRoaster)
  await choose(sheet, 'coffee-roast-level', 'option-light')
  await choose(sheet, 'coffee-roasted-for', 'option-filter')
  await pickDate(page, 'coffee-roasted-on', daysAgo(10))
  await sheet.getByTestId('coffee-size').fill('250')
  await sheet.getByTestId('coffee-price').fill('16.50')
  await sheet.getByTestId('add-coffee-submit').click()

  await expect(sheet).toBeHidden()
}

function stockCard(page: Page, name: string | RegExp) {
  return page
    .getByTestId('stock')
    .getByTestId('coffee-card')
    .filter({ has: page.getByTestId('coffee-card-name').getByText(name) })
}

async function editCoffee(page: Page, name: string) {
  await stockCard(page, name).click()
  await expect(page).toHaveURL(/\/coffees\//)
  await page.getByTestId('coffee-edit').click()

  return page.getByTestId('edit-coffee-sheet')
}

test('adds a coffee with its first bag and shows it in Stock', async ({
  page,
  member,
}) => {
  const roaster = uniqueName('Roaster')
  await page.goto(`/shelves/${member.shelfId}`)

  await addCoffee(page, { name: 'Ayele Fulasa', roaster, newRoaster: true })

  const card = stockCard(page, 'Ayele Fulasa')
  await expect(card.getByTestId('coffee-card-roaster')).toHaveText(roaster)
  await expect(card.getByTestId('coffee-card-roast')).toHaveText(
    'Light · Filter',
  )
  await expect(card.getByTestId('coffee-card-days')).toContainText('10')
  await expect(card.getByTestId('coffee-card-freshness')).toHaveText('Peak')

  await card.click()

  await expect(page.getByTestId('coffee-title')).toHaveText('Ayele Fulasa')
  await expect(page.getByTestId('purchase-size-price')).toHaveText(
    '250 g · €16.50',
  )
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

  await expect(page.getByTestId('coffee-card')).toHaveCount(1)

  await page.getByTestId('coffee-card').click()

  await expect(page.getByTestId('purchase-status')).toHaveText([
    'In stock',
    'In stock',
  ])
})

test('explains missing details and clears them once fixed', async ({
  page,
  member,
}) => {
  await page.goto(`/shelves/${member.shelfId}`)
  await page.getByTestId('page-add-coffee').click()
  const sheet = page.getByTestId('add-coffee-sheet')

  await sheet.getByTestId('add-coffee-submit').click()

  await expect(sheet.getByText('Give the coffee a name')).toBeVisible()
  await expect(sheet.getByText('Pick a roast level')).toBeVisible()

  await sheet.getByTestId('coffee-name').fill('Halo')
  await choose(sheet, 'coffee-roast-level', 'option-light')

  await expect(sheet.getByText('Give the coffee a name')).toBeHidden()
  await expect(sheet.getByText('Pick a roast level')).toBeHidden()
  await expect(sheet.getByText('Pick a roaster or add a new one')).toBeVisible()
})

test('lets the person who added a coffee fix its details', async ({
  page,
  member,
}) => {
  const roaster = uniqueName('Roaster')
  const newRoaster = uniqueName('Roaster')
  await page.goto(`/shelves/${member.shelfId}`)
  await addCoffee(page, { name: 'Ayele Fulasa', roaster, newRoaster: true })

  const sheet = await editCoffee(page, 'Ayele Fulasa')
  await expect(sheet.getByTestId('coffee-name')).toHaveValue('Ayele Fulasa')
  await sheet.getByTestId('coffee-name').fill('Ayele Fulasa Natural')
  await pickRoaster(page, newRoaster, true)
  await choose(sheet, 'coffee-roast-level', 'option-medium')
  await sheet.getByTestId('edit-coffee-submit').click()

  await expect(sheet).toBeHidden()
  await expect(page.getByTestId('coffee-title')).toHaveText(
    'Ayele Fulasa Natural',
  )
  await expect(page.getByTestId('coffee-roaster-name')).toHaveText(newRoaster)
  await expect(page.getByTestId('purchase-size-price')).toHaveText(
    '250 g · €16.50',
  )

  await page.getByTestId('coffee-back').click()

  await expect(
    stockCard(page, 'Ayele Fulasa Natural').getByTestId('coffee-card-roast'),
  ).toHaveText('Medium · Filter')
})

test('refuses a name the roaster already has', async ({ page, member }) => {
  const roaster = uniqueName('Roaster')
  await page.goto(`/shelves/${member.shelfId}`)
  await addCoffee(page, { name: 'Ayele Fulasa', roaster, newRoaster: true })
  await addCoffee(page, { name: 'Red Brick', roaster, newRoaster: false })

  const sheet = await editCoffee(page, 'Ayele Fulasa')
  await sheet.getByTestId('coffee-name').fill('red brick')
  await sheet.getByTestId('edit-coffee-submit').click()

  await expect(
    sheet.getByText(`${roaster} already has a coffee called Red Brick`),
  ).toBeVisible()
})

test('keeps a roast date optional', async ({ page, member }) => {
  const roaster = uniqueName('Roaster')
  await page.goto(`/shelves/${member.shelfId}`)
  await page.getByTestId('page-add-coffee').click()
  const sheet = page.getByTestId('add-coffee-sheet')

  await sheet.getByTestId('coffee-name').fill('Halo')
  await pickRoaster(page, roaster, true)
  await choose(sheet, 'coffee-roast-level', 'option-light')
  await choose(sheet, 'coffee-roasted-for', 'option-omni')
  await pickDate(page, 'coffee-roasted-on', daysAgo(5))
  await sheet.getByTestId('date-picker-clear').click()
  await expect(
    sheet.getByTestId('coffee-roasted-on').getByTestId('date-picker-trigger'),
  ).toHaveText('Pick a date')
  await sheet.getByTestId('add-coffee-submit').click()

  const card = stockCard(page, 'Halo')
  await expect(card.getByTestId('coffee-card-days')).toContainText(
    'no roast date',
  )
  await expect(card.getByTestId('coffee-card-freshness')).toHaveText('Unknown')
})

test('shows a coffee read-only to everyone but the person who added it', async ({
  page,
  member,
  people,
}) => {
  const roaster = uniqueName('Roaster')
  await page.goto(`/shelves/${member.shelfId}`)
  await addCoffee(page, { name: 'Ayele Fulasa', roaster, newRoaster: true })
  await stockCard(page, 'Ayele Fulasa').click()
  await expect(page).toHaveURL(/\/coffees\//)
  await expect(page.getByTestId('coffee-edit')).toBeVisible()
  const coffeePath = new URL(page.url()).pathname

  const sam = await people.signIn('Sam')
  await people.joinShelf(sam, member.shelfId)
  await page.goto(coffeePath)

  await expect(page.getByTestId('coffee-title')).toHaveText('Ayele Fulasa')
  await expect(page.getByTestId('purchase')).toHaveCount(1)
  await expect(page.getByTestId('coffee-edit')).toBeHidden()
})

test('lets an admin fix a coffee someone else added', async ({
  page,
  member,
  people,
}) => {
  const roaster = uniqueName('Roaster')
  await page.goto(`/shelves/${member.shelfId}`)
  await addCoffee(page, { name: 'Ayele Fulasa', roaster, newRoaster: true })
  await stockCard(page, 'Ayele Fulasa').click()
  await expect(page).toHaveURL(/\/coffees\//)
  const coffeePath = new URL(page.url()).pathname

  const admin = await people.signIn('Ada', 'admin')
  await people.joinShelf(admin, member.shelfId)
  await page.goto(coffeePath)
  await page.getByTestId('coffee-edit').click()
  const sheet = page.getByTestId('edit-coffee-sheet')
  await sheet.getByTestId('coffee-name').fill('Ayele Fulasa Washed')
  await sheet.getByTestId('edit-coffee-submit').click()

  await expect(page.getByTestId('coffee-title')).toHaveText(
    'Ayele Fulasa Washed',
  )
})

test('says when a shelf has no such coffee', async ({ page, member }) => {
  await page.goto(`/shelves/${member.shelfId}/coffees/${randomUUID()}`)

  await expect(page.getByTestId('error-title')).toHaveText('Not found')
  await expect(page.getByTestId('error-message')).toHaveText('Coffee not found')
})
