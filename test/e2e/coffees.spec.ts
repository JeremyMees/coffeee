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
    .getByTestId(isNew ? 'list-option-new' : 'list-option')
    .filter({ hasText: name })
    .first()
    .click()
}

async function pickOrigin(page: Page, country: string) {
  await page.getByTestId('coffee-origins').fill(country.slice(0, 5))
  await page
    .getByTestId('origin-option')
    .filter({ hasText: new RegExp(`^${country}$`) })
    .click()
}

async function pickFromList(
  page: Page,
  field: string,
  kind: 'scoped' | 'multi',
  name: string,
  option: string | RegExp,
) {
  const isNew = typeof option === 'string' && option.startsWith('Add')
  await page.getByTestId(field).fill(name)
  await page
    .getByTestId(isNew ? `${kind}-option-new` : `${kind}-option`)
    .filter({ hasText: option })
    .click()
}

function pickProcess(page: Page, name: string) {
  return pickFromList(
    page,
    'coffee-processes',
    'multi',
    name,
    new RegExp(`^${name}$`),
  )
}

function pickRegion(page: Page, name: string, option: string) {
  return pickFromList(page, 'coffee-regions', 'scoped', name, option)
}

async function addCoffee(
  page: Page,
  coffee: { name: string; roaster: string; newRoaster: boolean },
) {
  await page.getByTestId('page-add-coffee').click()

  const sheet = page.getByTestId('add-coffee-sheet')
  await sheet.getByTestId('coffee-name').fill(coffee.name)
  await pickRoaster(page, coffee.roaster, coffee.newRoaster)
  await pickOrigin(page, 'Ethiopia')
  await pickProcess(page, 'Washed')
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

test('suggests a similar roaster before adding a new one', async ({
  page,
  member,
}) => {
  const roaster = uniqueName('Roaster')
  await page.goto(`/shelves/${member.shelfId}`)
  await addCoffee(page, { name: 'Ayele Fulasa', roaster, newRoaster: true })

  await page.getByTestId('page-add-coffee').click()
  const misspelled = roaster.replace('Roaster', 'Roastery')
  await page.getByTestId('coffee-roaster').fill(misspelled)

  await expect(
    page.getByTestId('list-option').filter({ hasText: roaster }),
  ).toBeVisible()
  await expect(page.getByTestId('list-option-new')).toHaveText(
    `Add “${misspelled}”`,
  )
})

test('says where a blend was grown and keeps it up to date', async ({
  page,
  member,
}) => {
  const roaster = uniqueName('Roaster')
  const region = uniqueName('Huila')
  await page.goto(`/shelves/${member.shelfId}`)
  await page.getByTestId('page-add-coffee').click()
  const sheet = page.getByTestId('add-coffee-sheet')
  await sheet.getByTestId('coffee-name').fill('Huila Blend')
  await pickRoaster(page, roaster, true)
  await pickOrigin(page, 'Colombia')
  await pickOrigin(page, 'Ethiopia')
  await pickProcess(page, 'Washed')
  await pickRegion(page, region, `Add “${region}” in Colombia`)
  await sheet.getByTestId('coffee-altitude-from').fill('1700')
  await sheet.getByTestId('coffee-altitude-to').fill('2100')
  await choose(sheet, 'coffee-roast-level', 'option-light')
  await choose(sheet, 'coffee-roasted-for', 'option-filter')
  await sheet.getByTestId('add-coffee-submit').click()
  await expect(sheet).toBeHidden()

  await stockCard(page, 'Huila Blend').click()

  await expect(page.getByTestId('detail-origins')).toHaveText(
    'Colombia, Ethiopia',
  )
  await expect(page.getByTestId('detail-regions')).toHaveText(
    `${region} (Colombia)`,
  )
  await expect(page.getByTestId('detail-altitude')).toHaveText('1,700–2,100 m')

  await page.getByTestId('coffee-edit').click()
  const edit = page.getByTestId('edit-coffee-sheet')
  await edit
    .getByTestId('coffee-origins-chips')
    .getByRole('button', { name: 'Remove Colombia' })
    .click()
  await expect(edit.getByTestId('coffee-regions-chips')).toBeHidden()
  await edit.getByTestId('coffee-altitude-to').fill('')
  await edit.getByTestId('edit-coffee-submit').click()

  await expect(page.getByTestId('detail-origins')).toHaveText('Ethiopia')
  await expect(page.getByTestId('detail-regions')).toBeHidden()
  await expect(page.getByTestId('detail-altitude')).toHaveText('1,700 m')
})

test('suggests a region another coffee already used', async ({
  page,
  member,
}) => {
  const roaster = uniqueName('Roaster')
  const region = uniqueName('Yirgacheffe')
  await page.goto(`/shelves/${member.shelfId}`)
  await addCoffee(page, { name: 'Ayele Fulasa', roaster, newRoaster: true })
  const coffee = stockCard(page, 'Ayele Fulasa')
  await coffee.click()
  await page.getByTestId('coffee-edit').click()
  await pickRegion(page, region, `Add “${region}”`)
  await page.getByTestId('edit-coffee-submit').click()
  await expect(page.getByTestId('detail-regions')).toHaveText(region)

  await page.getByTestId('coffee-back').click()
  await page.getByTestId('page-add-coffee').click()
  await pickOrigin(page, 'Ethiopia')
  await page
    .getByTestId('coffee-regions')
    .fill(region.replace('Yirgacheffe', 'Yirgachefe'))

  await expect(
    page.getByTestId('scoped-option').filter({ hasText: region }),
  ).toBeVisible()
})

test('says who grew a coffee and where it was processed', async ({
  page,
  member,
}) => {
  const roaster = uniqueName('Roaster')
  const producer = uniqueName('Nestor Lasso')
  const farm = uniqueName('El Diviso')
  const station = uniqueName('Hambela')
  await page.goto(`/shelves/${member.shelfId}`)
  await page.getByTestId('page-add-coffee').click()
  const sheet = page.getByTestId('add-coffee-sheet')
  await sheet.getByTestId('coffee-name').fill('Pink Bourbon')
  await pickRoaster(page, roaster, true)
  await pickOrigin(page, 'Colombia')
  await pickOrigin(page, 'Ethiopia')
  await pickProcess(page, 'Washed')
  await pickFromList(
    page,
    'coffee-farms',
    'scoped',
    farm,
    `Add “${farm}” in Colombia`,
  )
  await pickFromList(
    page,
    'coffee-washing-stations',
    'scoped',
    station,
    `Add “${station}” in Ethiopia`,
  )
  await pickFromList(
    page,
    'coffee-producers',
    'multi',
    producer,
    `Add “${producer}”`,
  )
  await choose(sheet, 'coffee-roast-level', 'option-light')
  await choose(sheet, 'coffee-roasted-for', 'option-filter')
  await sheet.getByTestId('add-coffee-submit').click()
  await expect(sheet).toBeHidden()

  await stockCard(page, 'Pink Bourbon').click()

  await expect(page.getByTestId('detail-producers')).toHaveText(producer)
  await expect(page.getByTestId('detail-farms')).toHaveText(
    `${farm} (Colombia)`,
  )
  await expect(page.getByTestId('detail-washing-stations')).toHaveText(
    `${station} (Ethiopia)`,
  )

  await page.getByTestId('coffee-edit').click()
  const edit = page.getByTestId('edit-coffee-sheet')
  await edit
    .getByTestId('coffee-origins-chips')
    .getByRole('button', { name: 'Remove Colombia' })
    .click()
  await expect(edit.getByTestId('coffee-farms-chips')).toBeHidden()
  await edit
    .getByTestId('coffee-producers-chips')
    .getByRole('button', { name: `Remove ${producer}` })
    .click()
  await edit.getByTestId('edit-coffee-submit').click()

  await expect(page.getByTestId('detail-washing-stations')).toHaveText(station)
  await expect(page.getByTestId('detail-farms')).toBeHidden()
  await expect(page.getByTestId('detail-producers')).toBeHidden()
})

test('says how a coffee was made and links to the roaster', async ({
  page,
  member,
}) => {
  const roaster = uniqueName('Roaster')
  const varietal = uniqueName('Pink Bourbon')
  const flavor = uniqueName('Bergamot')
  await page.goto(`/shelves/${member.shelfId}`)
  await page.getByTestId('page-add-coffee').click()
  const sheet = page.getByTestId('add-coffee-sheet')
  await sheet.getByTestId('coffee-name').fill('Thermal')
  await pickRoaster(page, roaster, true)
  await pickOrigin(page, 'Colombia')
  await pickProcess(page, 'Washed')
  await pickProcess(page, 'Anaerobic')
  await pickFromList(
    page,
    'coffee-varietals',
    'multi',
    varietal,
    `Add “${varietal}”`,
  )
  await pickFromList(
    page,
    'coffee-flavor-notes',
    'multi',
    flavor,
    `Add “${flavor}”`,
  )
  await sheet.getByTestId('coffee-link').fill('https://example.com/thermal')
  await choose(sheet, 'coffee-roast-level', 'option-light')
  await choose(sheet, 'coffee-roasted-for', 'option-filter')
  await sheet.getByTestId('add-coffee-submit').click()
  await expect(sheet).toBeHidden()

  await expect(
    stockCard(page, 'Thermal').getByTestId('coffee-card-flavor-note'),
  ).toHaveText(flavor)
  await stockCard(page, 'Thermal').click()

  await expect(page.getByTestId('detail-processes')).toHaveText(
    'Washed, Anaerobic',
  )
  await expect(page.getByTestId('detail-varietals')).toHaveText(varietal)
  await expect(page.getByTestId('coffee-card-flavor-note')).toHaveText(flavor)
  await expect(page.getByTestId('coffee-link-out')).toHaveAttribute(
    'href',
    'https://example.com/thermal',
  )

  await page.getByTestId('coffee-edit').click()
  const edit = page.getByTestId('edit-coffee-sheet')
  await edit
    .getByTestId('coffee-processes-chips')
    .getByRole('button', { name: 'Remove Washed' })
    .click()
  await edit
    .getByTestId('coffee-flavor-notes-chips')
    .getByRole('button', { name: `Remove ${flavor}` })
    .click()
  await edit.getByTestId('coffee-link').fill('')
  await edit.getByTestId('edit-coffee-submit').click()

  await expect(page.getByTestId('detail-processes')).toHaveText('Anaerobic')
  await expect(page.getByTestId('coffee-link-out')).toBeHidden()
  await expect(page.getByTestId('coffee-card-flavor-notes')).toBeHidden()
})

test('keeps a roast date optional', async ({ page, member }) => {
  const roaster = uniqueName('Roaster')
  await page.goto(`/shelves/${member.shelfId}`)
  await page.getByTestId('page-add-coffee').click()
  const sheet = page.getByTestId('add-coffee-sheet')

  await sheet.getByTestId('coffee-name').fill('Halo')
  await pickRoaster(page, roaster, true)
  await pickOrigin(page, 'Kenya')
  await pickProcess(page, 'Washed')
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

async function bagPhoto(page: Page, colour: string) {
  const dataUrl = await page.evaluate(fill => {
    const canvas = document.createElement('canvas')
    canvas.width = 3200
    canvas.height = 2400
    const context = canvas.getContext('2d')!
    context.fillStyle = fill
    context.fillRect(0, 0, canvas.width, canvas.height)

    return canvas.toDataURL('image/png')
  }, colour)

  return {
    name: 'bag.png',
    mimeType: 'image/png',
    buffer: Buffer.from(dataUrl.split(',')[1]!, 'base64'),
  }
}

test('gives a coffee a shrunk photo of its bag and lets it be replaced or removed', async ({
  page,
  member,
}) => {
  const roaster = uniqueName('Roaster')
  await page.goto(`/shelves/${member.shelfId}`)
  await addCoffee(page, { name: 'Ayele Fulasa', roaster, newRoaster: true })
  await expect(
    stockCard(page, 'Ayele Fulasa').getByTestId('coffee-card-placeholder'),
  ).toBeVisible()
  await stockCard(page, 'Ayele Fulasa').click()
  await expect(page.getByTestId('coffee-photo-placeholder')).toBeVisible()

  await page
    .getByTestId('coffee-photo-input')
    .setInputFiles(await bagPhoto(page, '#e4572e'))

  const photo = page.getByTestId('coffee-photo-image')
  await expect(photo).toHaveAttribute('src', /\.webp$/)
  await expect
    .poll(() => photo.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBe(1600)
  const firstUrl = await photo.getAttribute('src')

  await page
    .getByTestId('coffee-photo-input')
    .setInputFiles(await bagPhoto(page, '#3d5a80'))

  await expect(photo).not.toHaveAttribute('src', firstUrl!)
  expect((await page.request.get(firstUrl!)).status()).toBe(404)
  const secondUrl = await photo.getAttribute('src')

  await page.getByTestId('coffee-back').click()
  await expect(
    stockCard(page, 'Ayele Fulasa').getByTestId('coffee-card-photo'),
  ).toHaveAttribute('src', secondUrl!)

  await stockCard(page, 'Ayele Fulasa').click()
  await page.getByTestId('coffee-photo-remove').click()

  await expect(page.getByTestId('coffee-photo-placeholder')).toBeVisible()
  expect((await page.request.get(secondUrl!)).status()).toBe(404)
})

test('buys a coffee again, finishes its bags and keeps its history tidy', async ({
  page,
  member,
}) => {
  const roaster = uniqueName('Roaster')
  await page.goto(`/shelves/${member.shelfId}`)
  await addCoffee(page, { name: 'Ayele Fulasa', roaster, newRoaster: true })
  await stockCard(page, 'Ayele Fulasa').click()
  await expect(page).toHaveURL(/\/coffees\//)

  await page.getByTestId('coffee-buy-again').click()
  const sheet = page.getByTestId('purchase-sheet')
  await expect(sheet.getByTestId('coffee-size')).toHaveValue('250')
  await expect(sheet.getByTestId('coffee-price')).toHaveValue('16.50')
  await sheet.getByTestId('coffee-size').fill('1000')
  await sheet.getByTestId('coffee-price').fill('52')
  await sheet.getByTestId('purchase-submit').click()
  await expect(sheet).toBeHidden()

  await expect(page.getByTestId('purchase')).toHaveCount(2)
  await expect(page.getByTestId('summary-times-bought')).toHaveText('2 times')
  await expect(page.getByTestId('summary-latest-price')).toHaveText('€52.00')
  await expect(page.getByTestId('summary-price-per-gram')).toHaveText(
    '€0.052/g',
  )

  await page.getByTestId('coffee-finish').click()
  await expect(page.getByTestId('purchase-status')).toHaveText([
    'In stock',
    'Finished',
  ])

  const latest = page.getByTestId('purchase').first()
  await latest.getByTestId('purchase-edit').click()
  await expect(sheet.getByTestId('coffee-size')).toHaveValue('1000')
  await sheet.getByTestId('coffee-price').fill('48')
  await sheet.getByTestId('purchase-submit').click()
  await expect(sheet).toBeHidden()
  await expect(latest.getByTestId('purchase-size-price')).toHaveText(
    '1000 g · €48.00',
  )

  await latest.getByTestId('purchase-finish').click()
  await expect(page.getByTestId('coffee-finish')).toBeHidden()
  await page.getByTestId('coffee-back').click()
  await expect(page.getByTestId('stock-empty')).toBeVisible()

  await page.goBack()
  for (let left = 2; left > 0; left--) {
    await page.getByTestId('purchase-delete').first().click()
    await page.getByTestId('purchase-delete-confirm').click()
    await expect(page.getByTestId('purchase')).toHaveCount(left - 1)
  }

  await expect(page.getByTestId('purchases-empty')).toBeVisible()
  await expect(page.getByTestId('coffee-title')).toHaveText('Ayele Fulasa')
})

test('says when a shelf has no such coffee', async ({ page, member }) => {
  await page.goto(`/shelves/${member.shelfId}/coffees/${randomUUID()}`)

  await expect(page.getByTestId('error-title')).toHaveText('Not found')
  await expect(page.getByTestId('error-message')).toHaveText('Coffee not found')
})
