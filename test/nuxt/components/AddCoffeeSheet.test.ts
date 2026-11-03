import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AddCoffeeSheet from '~/components/AddCoffeeSheet.vue'
import { useAddCoffee, useCurrentUser } from '#imports'
import { api, fakeApi, resetApi } from '../fake-api'
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
  testUser,
  type,
} from '../fixtures'

fakeApi()

beforeEach(() => {
  forgetLastShelf()
  resetApi()
  useCurrentUser().value = testUser()
  useAddCoffee().value = false
})

async function openSheet(route = '/shelves/home') {
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
      route: '/shelves/home',
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
    expect(api.added).toEqual([])
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
    await openSheet('/shelves/home/library')

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

    await vi.waitFor(() => expect(api.added).toHaveLength(1))
    expect(api.added).toEqual([
      {
        name: 'Ayele Fulasa',
        roaster: 'Square Mile',
        roastLevel: 'light',
        roastedFor: 'filter',
        origins: ['ET'],
        regions: [{ origin: 'ET', name: 'Guji' }],
        farms: [],
        washingStations: [{ origin: 'ET', name: 'Hambela' }],
        producers: ['Tesfaye'],
        processes: ['Washed'],
        varietals: [],
        flavorNotes: [],
        link: null,
        altitudeFrom: 1900,
        altitudeTo: 2200,
        purchasedOn: localDate(),
        roastedOn: daysAgo(10),
        sizeGrams: 250,
        price: 16.5,
      },
    ])
    await addedAndGone('/shelves/home')
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

    await vi.waitFor(() => expect(api.added).toHaveLength(1))
    expect(api.added).toEqual([
      expect.objectContaining({
        roaster: 'April',
        origins: ['KE'],
        regions: [],
        processes: ['Thermal shock'],
        varietals: [],
        flavorNotes: [],
        link: null,
        altitudeFrom: null,
        altitudeTo: null,
        roastedOn: null,
        sizeGrams: null,
        price: null,
      }),
    ])
    await addedAndGone('/shelves/home')
  })

  it('shows what the server refused next to the field', async () => {
    await openSheet()

    await fillRequired('Broken')
    await addCoffee()

    await vi.waitFor(() =>
      expect(sheetText()).toContain('That name is taken by a ghost'),
    )
    expect(currentStep()).toBe('add-coffee-step-coffee')
    expect(useAddCoffee().value).toBe(true)
  })

  it('marks the dates the server refused', async () => {
    await openSheet()

    await fillRequired('Dates')
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
    await openSheet()

    await fillRequired('Crash')
    await addCoffee()

    await vi.waitFor(() =>
      expect(byTestId('form-error')!.textContent?.trim()).toBe(
        'Something went wrong. Try again.',
      ),
    )
    expect(useAddCoffee().value).toBe(true)
  })

  it('sends nothing when there is no shelf to add to', async () => {
    useCurrentUser().value = testUser({ shelves: [] })
    await openSheet('/profile')

    await fillRequired()
    await addCoffee()

    await new Promise(resolve => setTimeout(resolve, 50))
    expect(api.added).toEqual([])
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
