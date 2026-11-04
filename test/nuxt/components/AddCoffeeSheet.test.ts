import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { eq } from 'drizzle-orm'
import AddCoffeeSheet from '~/components/AddCoffeeSheet.vue'
import { shelfPath, useAddCoffee, useCurrentUser } from '#imports'
import { coffee, purchase, roaster } from '#server/db/schemas'
import { descriptionOf } from '#server/utils/descriptions'
import type { Member } from '#test/support/types'
import {
  byTestId,
  click,
  currentPath,
  daysAgo,
  forgetLastShelf,
  inputValue,
  pickDate,
  pickOrigin,
  pickMulti,
  pickRoaster,
  pickScoped,
  pickerOptions,
  submit,
  type,
} from '../fixtures'
import { database, failRequest, scenario, signIn } from '../server'

let sarah: Member

beforeEach(async () => {
  forgetLastShelf()
  sarah = await scenario.member('Sarah')
  const tom = await scenario.member('Tom')
  await scenario.coffee(tom.shelf, {
    name: 'Hambela Lot',
    regions: [{ origin: 'ET', name: 'Guji' }],
    washingStations: [{ origin: 'ET', name: 'Hambela' }],
  })
  await signIn(sarah)
  useAddCoffee().value = false
})

function coffeesPath() {
  return `/api/shelves/${sarah.shelf.id}/coffees`
}

async function bagsOnShelf() {
  const db = await database()

  return db
    .select({
      coffee: coffee.name,
      roaster: roaster.name,
      purchasedOn: purchase.purchasedOn,
      roastedOn: purchase.roastedOn,
      sizeGrams: purchase.sizeGrams,
      priceCents: purchase.priceCents,
    })
    .from(purchase)
    .innerJoin(coffee, eq(coffee.id, purchase.coffeeId))
    .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
    .where(eq(purchase.shelfId, sarah.shelf.id))
}

async function addedCoffee(name: string) {
  const db = await database()
  const [found] = await db
    .select({
      id: coffee.id,
      name: coffee.name,
      roaster: roaster.name,
      roastLevel: coffee.roastLevel,
      roastedFor: coffee.roastedFor,
      link: coffee.link,
      altitudeFrom: coffee.altitudeFrom,
      altitudeTo: coffee.altitudeTo,
    })
    .from(coffee)
    .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
    .where(eq(coffee.name, name))

  return { ...found!, ...(await descriptionOf(db, found!.id)) }
}

function names(entries: { name: string }[]) {
  return entries.map(entry => entry.name)
}

async function openSheet(route = shelfPath(sarah.shelf)) {
  const sheet = await mountSuspended(AddCoffeeSheet, {
    route,
    attachTo: document.body,
  })

  useAddCoffee().value = true
  await vi.waitFor(
    () => expect(byTestId('add-coffee-form')).not.toBeNull(),
    3000,
  )

  return sheet
}

function sheetText() {
  return byTestId('add-coffee-sheet')!.textContent
}

async function fillRequired(name = 'Ayele Fulasa') {
  await type('coffee-name', name)
  await pickRoaster('square', 'Square Mile')
  await pickOrigin('ethi', 'Ethiopia')
  await pickMulti('coffee-processes', 'wash', 'Washed')
  await click('coffee-roast-level', 'option-light')
  await click('coffee-roasted-for', 'option-filter')
}

function onStep(testId: string) {
  return byTestId(testId)!.style.display !== 'none'
}

const panes = {
  'add-coffee-pane-1': 'add-coffee-step-coffee',
  'add-coffee-pane-2': 'add-coffee-step-origin',
  'add-coffee-pane-3': 'add-coffee-step-taste',
  'add-coffee-pane-4': 'add-coffee-step-bag',
}

function currentStep() {
  const pane = Object.keys(panes).find(onStep) as keyof typeof panes

  return panes[pane]
}

function failingSteps() {
  return [1, 2, 3, 4].filter(
    number => byTestId(`add-coffee-step-${number}`)!.dataset.failing,
  )
}

async function toBag() {
  for (const next of [
    'add-coffee-step-origin',
    'add-coffee-step-taste',
    'add-coffee-step-bag',
  ]) {
    await click('add-coffee-next')
    await vi.waitFor(() => expect(currentStep()).toBe(next))
  }
}

async function addCoffee() {
  await toBag()
  await submit('add-coffee-form')
}

async function addedAndGone(stockPath: string) {
  await vi.waitFor(() => {
    expect(useAddCoffee().value).toBe(false)
    expect(currentPath()).toBe(stockPath)
  })
}

describe('AddCoffeeSheet', () => {
  it('stays closed until asked for', async () => {
    await mountSuspended(AddCoffeeSheet, {
      route: shelfPath(sarah.shelf),
    })

    expect(byTestId('add-coffee-sheet')).toBeNull()
  })

  it('opens with today as the purchase date', async () => {
    await openSheet()

    expect(byTestId('form-sheet-title')!.textContent).toContain('Add coffee')
    expect(
      byTestId('coffee-purchased-on', 'date-picker-trigger')!.textContent,
    ).toContain(formatDate(localDate()))
  })

  it('starts on the first of four steps', async () => {
    await openSheet()

    expect(currentStep()).toBe('add-coffee-step-coffee')
    expect(byTestId('add-coffee-steps')!.textContent).toContain('Coffee')
    expect(byTestId('add-coffee-steps')!.textContent).toContain('First bag')
    expect(byTestId('add-coffee-back')).toBeNull()
    expect(byTestId('add-coffee-submit')).not.toBeNull()
  })

  it('moves between steps without asking for anything first', async () => {
    await openSheet()

    await click('add-coffee-next')
    expect(currentStep()).toBe('add-coffee-step-origin')

    byTestId('add-coffee-step-4')!
      .querySelector('button')!
      .dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await flushPromises()
    expect(currentStep()).toBe('add-coffee-step-bag')

    await click('add-coffee-back')
    expect(currentStep()).toBe('add-coffee-step-taste')
    expect(sheetText()).not.toContain('Give the coffee a name')
  })

  it('goes back to the first step with a problem when adding', async () => {
    await openSheet()
    await type('coffee-name', 'Ayele Fulasa')
    await pickRoaster('square', 'Square Mile')

    await addCoffee()

    await vi.waitFor(() => expect(currentStep()).toBe('add-coffee-step-origin'))
    expect(sheetText()).toContain('Pick where it was grown')
    expect(sheetText()).toContain('Pick a roast level')
    expect(failingSteps()).toEqual([2, 3])
    expect(await bagsOnShelf()).toEqual([])
  })

  it('explains every missing detail, starting from the first step', async () => {
    await openSheet()

    await addCoffee()

    await vi.waitFor(() => expect(currentStep()).toBe('add-coffee-step-coffee'))
    expect(sheetText()).toContain('Give the coffee a name')
    expect(sheetText()).toContain('Pick a roaster or add a new one')
    expect(failingSteps()).toEqual([1, 2, 3])
  })

  it('keeps what was filled in when moving between steps', async () => {
    await openSheet()
    await type('coffee-name', 'Ayele Fulasa')

    await click('add-coffee-next')
    await click('add-coffee-back')

    expect(currentStep()).toBe('add-coffee-step-coffee')
    expect(inputValue('coffee-name')).toBe('Ayele Fulasa')
  })

  it('explains a size or price that makes no sense', async () => {
    await openSheet()

    await fillRequired()
    await toBag()
    await type('coffee-size', '0')
    await type('coffee-price', '-2')
    await submit('add-coffee-form')

    await vi.waitFor(() => {
      expect(sheetText()).toContain('The size has to be more than 0 g')
      expect(sheetText()).toContain("The price can't be negative")
    })
  })

  it('offers existing roasters whatever the case, spacing or hyphens', async () => {
    await openSheet()

    await type('coffee-roaster', 'square-mile')

    await vi.waitFor(() => expect(pickerOptions()).toEqual(['Square Mile']))
  })

  it('adds the coffee with its first bag and goes to the stock', async () => {
    await openSheet(`${shelfPath(sarah.shelf)}/library`)

    await fillRequired()
    await pickScoped('coffee-regions', 'guj', 'Guji')
    await pickScoped('coffee-washing-stations', 'hamb', 'Hambela')
    await pickMulti('coffee-producers', 'Tesfaye', 'Add “Tesfaye”')
    await type('coffee-altitude-from', '1900')
    await type('coffee-altitude-to', '2200')
    await pickDate('coffee-roasted-on', daysAgo(10))
    await type('coffee-size', '250')
    await type('coffee-price', '16.5')
    await addCoffee()

    await addedAndGone(shelfPath(sarah.shelf))
    expect(await bagsOnShelf()).toEqual([
      {
        coffee: 'Ayele Fulasa',
        roaster: 'Square Mile',
        purchasedOn: localDate(),
        roastedOn: daysAgo(10),
        sizeGrams: 250,
        priceCents: 1650,
      },
    ])
    const added = await addedCoffee('Ayele Fulasa')
    expect(added).toMatchObject({
      roaster: 'Square Mile',
      roastLevel: 'light',
      roastedFor: 'filter',
      link: null,
      altitudeFrom: 1900,
      altitudeTo: 2200,
      origins: [{ code: 'ET', name: 'Ethiopia' }],
      regions: [expect.objectContaining({ origin: 'ET', name: 'Guji' })],
      farms: [],
      washingStations: [
        expect.objectContaining({ origin: 'ET', name: 'Hambela' }),
      ],
    })
    expect(names(added.producers)).toEqual(['Tesfaye'])
    expect(names(added.processes)).toEqual(['Washed'])
    expect(added.varietals).toEqual([])
    expect(added.flavorNotes).toEqual([])
  })

  it('leaves the optional details empty and can add a new roaster', async () => {
    await openSheet()

    await type('coffee-name', 'Halo')
    await pickRoaster('April', 'Add “April”')
    await pickOrigin('kenya', 'Kenya')
    await pickMulti('coffee-processes', 'Thermal shock', 'Add “Thermal shock”')
    await click('coffee-roast-level', 'option-light')
    await click('coffee-roasted-for', 'option-omni')
    await addCoffee()

    await addedAndGone(shelfPath(sarah.shelf))
    expect(await bagsOnShelf()).toEqual([
      {
        coffee: 'Halo',
        roaster: 'April',
        purchasedOn: localDate(),
        roastedOn: null,
        sizeGrams: null,
        priceCents: null,
      },
    ])
    const added = await addedCoffee('Halo')
    expect(added).toMatchObject({
      roaster: 'April',
      roastedFor: 'omni',
      link: null,
      altitudeFrom: null,
      altitudeTo: null,
      origins: [{ code: 'KE', name: 'Kenya' }],
      regions: [],
      varietals: [],
      flavorNotes: [],
    })
    expect(names(added.processes)).toEqual(['Thermal shock'])
  })

  it('shows the reason the server refused it', async () => {
    failRequest('POST', coffeesPath(), {
      status: 409,
      message: 'That coffee could not be added',
    })
    await openSheet()

    await fillRequired()
    await addCoffee()

    await vi.waitFor(() =>
      expect(byTestId('form-error')!.textContent?.trim()).toBe(
        'That coffee could not be added',
      ),
    )
    expect(useAddCoffee().value).toBe(true)
    expect(await bagsOnShelf()).toEqual([])
  })

  it('shows what the server refused next to the field', async () => {
    failRequest('POST', coffeesPath(), {
      status: 400,
      message: 'Give the coffee a name',
      errors: { name: 'That name is taken by a ghost' },
    })
    await openSheet()

    await fillRequired()
    await addCoffee()

    await vi.waitFor(() =>
      expect(sheetText()).toContain('That name is taken by a ghost'),
    )
    expect(currentStep()).toBe('add-coffee-step-coffee')
    expect(useAddCoffee().value).toBe(true)
  })

  it('marks the dates the server refused', async () => {
    failRequest('POST', coffeesPath(), {
      status: 400,
      message: '',
      errors: {
        purchasedOn: 'Enter the date you bought it',
        roastedOn: 'Enter the roast date as a date',
      },
    })
    await openSheet()

    await fillRequired()
    await addCoffee()

    await vi.waitFor(() =>
      expect(sheetText()).toContain('Enter the date you bought it'),
    )
    expect(sheetText()).toContain('Enter the roast date as a date')
    expect(
      byTestId('coffee-purchased-on')!.closest('[data-invalid="true"]'),
    ).not.toBeNull()
    expect(
      byTestId('coffee-roasted-on')!.closest('[data-invalid="true"]'),
    ).not.toBeNull()
  })

  it('says something went wrong when the server gives no reason', async () => {
    failRequest('POST', coffeesPath(), { status: 500, message: '' })
    await openSheet()

    await fillRequired()
    await addCoffee()

    await vi.waitFor(() =>
      expect(byTestId('form-error')!.textContent?.trim()).toBe(
        'Something went wrong. Try again.',
      ),
    )
    expect(useAddCoffee().value).toBe(true)
  })

  it('adds nothing when there is no shelf to add to', async () => {
    useCurrentUser().value = { ...useCurrentUser().value!, shelves: [] }
    await openSheet('/profile')

    await fillRequired()
    await addCoffee()

    await new Promise(resolve => setTimeout(resolve, 50))
    expect(await bagsOnShelf()).toEqual([])
    expect(useAddCoffee().value).toBe(true)
  })

  it('closes from its close button', async () => {
    await openSheet()

    byTestId('add-coffee-sheet')!
      .querySelector<HTMLElement>('[data-testid="form-sheet-close"]')!
      .click()
    await flushPromises()

    expect(useAddCoffee().value).toBe(false)
  })

  it('starts empty on the first step again the next time it opens', async () => {
    await openSheet()
    await fillRequired('Half typed')
    await toBag()

    useAddCoffee().value = false
    await flushPromises()
    useAddCoffee().value = true
    await flushPromises()

    expect(inputValue('coffee-name')).toBe('')
    expect(currentStep()).toBe('add-coffee-step-coffee')
  })
})
