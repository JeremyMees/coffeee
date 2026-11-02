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
  pickRoaster,
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
  await vi.waitFor(() => expect(byTestId('add-coffee-form')).not.toBeNull())

  return sheet
}

function sheetText() {
  return byTestId('add-coffee-sheet')!.textContent
}

async function fillRequired(name = 'Ayele Fulasa') {
  await type('coffee-name', name)
  await pickRoaster('square', 'Square Mile')
  await click('coffee-roast-level', 'option-light')
  await click('coffee-roasted-for', 'option-filter')
}

describe('AddCoffeeSheet', () => {
  it('stays closed until asked for', async () => {
    await mountSuspended(AddCoffeeSheet, {
      route: '/shelves/home',
    })

    expect(byTestId('add-coffee-sheet')).toBeNull()
  })

  it('opens with today as the purchase date and a bag colour picked', async () => {
    await openSheet()

    expect(byTestId('form-sheet-title')!.textContent).toContain('Add coffee')
    expect(
      byTestId('coffee-purchased-on', 'date-picker-trigger')!.textContent,
    ).toContain(formatDate(localDate()))
    expect(
      byTestId('coffee-colour')!.querySelectorAll('input:checked'),
    ).toHaveLength(1)
  })

  it('explains every missing detail before sending anything', async () => {
    await openSheet()

    await submit('add-coffee-form')

    await vi.waitFor(() => {
      expect(sheetText()).toContain('Give the coffee a name')
      expect(sheetText()).toContain('Pick a roaster or add a new one')
      expect(sheetText()).toContain('Pick a roast level')
      expect(sheetText()).toContain('Pick what it was roasted for')
    })
    expect(api.added).toEqual([])
  })

  it('explains a size or price that makes no sense', async () => {
    await openSheet()

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
    await click('coffee-colour', 'colour-slate')
    await pickDate('coffee-roasted-on', daysAgo(10))
    await type('coffee-size', '250')
    await type('coffee-price', '16.5')
    await submit('add-coffee-form')

    await vi.waitFor(() => expect(api.added).toHaveLength(1))
    expect(api.added).toEqual([
      {
        name: 'Ayele Fulasa',
        roaster: 'Square Mile',
        roastLevel: 'light',
        roastedFor: 'filter',
        colour: '#3d5a80',
        purchasedOn: localDate(),
        roastedOn: daysAgo(10),
        sizeGrams: 250,
        price: 16.5,
      },
    ])
    await vi.waitFor(() => expect(useAddCoffee().value).toBe(false))
    expect(currentPath()).toBe('/shelves/home')
  })

  it('leaves the optional details empty and can add a new roaster', async () => {
    await openSheet()

    await type('coffee-name', 'Halo')
    await pickRoaster('April', 'Add “April”')
    await click('coffee-roast-level', 'option-light')
    await click('coffee-roasted-for', 'option-omni')
    await submit('add-coffee-form')

    await vi.waitFor(() => expect(api.added).toHaveLength(1))
    expect(api.added).toEqual([
      expect.objectContaining({
        roaster: 'April',
        roastedOn: null,
        sizeGrams: null,
        price: null,
      }),
    ])
  })

  it('shows what the server refused next to the field', async () => {
    await openSheet()

    await fillRequired('Broken')
    await submit('add-coffee-form')

    await vi.waitFor(() =>
      expect(sheetText()).toContain('That name is taken by a ghost'),
    )
    expect(useAddCoffee().value).toBe(true)
  })

  it('marks the dates the server refused', async () => {
    await openSheet()

    await fillRequired('Dates')
    await submit('add-coffee-form')

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
    await submit('add-coffee-form')

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
    await submit('add-coffee-form')

    await new Promise(resolve => setTimeout(resolve, 50))
    expect(api.added).toEqual([])
  })

  it('closes from its close button', async () => {
    await openSheet()

    byTestId('add-coffee-sheet')!
      .querySelector<HTMLElement>('[data-slot="sheet-close"]')!
      .click()
    await flushPromises()

    expect(useAddCoffee().value).toBe(false)
  })

  it('starts empty again the next time it opens', async () => {
    await openSheet()
    await type('coffee-name', 'Half typed')

    useAddCoffee().value = false
    await flushPromises()
    useAddCoffee().value = true
    await flushPromises()

    expect(inputValue('coffee-name')).toBe('')
  })
})
