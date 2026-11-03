import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import EditCoffeeSheet from '~/components/EditCoffeeSheet.vue'
import { useCurrentUser } from '#imports'
import { api, fakeApi, resetApi } from '../fake-api'
import {
  byTestId,
  click,
  inputValue,
  isChecked,
  chipLabels,
  pickOrigin,
  pickMulti,
  pickRoaster,
  pickScoped,
  submit,
  testUser,
  type,
} from '../fixtures'

fakeApi()

beforeEach(() => {
  resetApi()
  useCurrentUser().value = testUser()
})

const coffee = {
  id: 'c1',
  name: 'Ayele Fulasa',
  roaster: 'Square Mile',
  roastLevel: 'light' as const,
  roastedFor: 'filter' as const,
  origins: [{ code: 'ET', name: 'Ethiopia' }],
  regions: [{ id: 'g1', name: 'Guji', origin: 'ET' }],
  farms: [],
  washingStations: [{ id: 'w1', name: 'Hambela', origin: 'ET' }],
  producers: [{ id: 'n1', name: 'Nestor Lasso' }],
  processes: [{ id: 's1', name: 'Washed' }],
  varietals: [{ id: 'v1', name: 'Geisha' }],
  flavorNotes: [{ id: 'n1', name: 'Lime' }],
  link: 'https://example.com/ayele',
  altitudeFrom: 1900,
  altitudeTo: 2200,
}

async function openSheet(open = true) {
  const sheet = await mountSuspended(EditCoffeeSheet, {
    route: '/shelves/home/coffees/c1',
    props: { shelfId: 'home', coffee, open },
    attachTo: document.body,
  })

  if (open) {
    await vi.waitFor(
      () => expect(byTestId('edit-coffee-form')).not.toBeNull(),
      3000,
    )
  }

  return sheet
}

function sheetText() {
  return byTestId('edit-coffee-sheet')!.textContent
}

describe('EditCoffeeSheet', () => {
  it('opens with the current details filled in', async () => {
    await openSheet()

    expect(byTestId('form-sheet-title')!.textContent).toContain('Edit coffee')
    expect(inputValue('coffee-name')).toBe('Ayele Fulasa')
    expect(inputValue('coffee-roaster')).toBe('Square Mile')
    expect(isChecked('coffee-roast-level', 'option-light')).toBe(true)
    expect(isChecked('coffee-roasted-for', 'option-filter')).toBe(true)
    expect(chipLabels('coffee-origins-chips')).toEqual(['Ethiopia'])
    expect(chipLabels('coffee-regions-chips')).toEqual(['Guji'])
    expect(chipLabels('coffee-washing-stations-chips')).toEqual(['Hambela'])
    expect(chipLabels('coffee-producers-chips')).toEqual(['Nestor Lasso'])
    expect(chipLabels('coffee-processes-chips')).toEqual(['Washed'])
    expect(chipLabels('coffee-varietals-chips')).toEqual(['Geisha'])
    expect(chipLabels('coffee-flavor-notes-chips')).toEqual(['Lime'])
    expect(inputValue('coffee-link')).toBe('https://example.com/ayele')
    expect(inputValue('coffee-altitude-from')).toBe('1900')
    expect(inputValue('coffee-altitude-to')).toBe('2200')
  })

  it('drops the regions of an origin that is removed', async () => {
    await openSheet()

    await pickOrigin('colom', 'Colombia')
    await pickScoped('coffee-regions', 'hui', 'Huila · Colombia')
    await click('coffee-origins-chips', 'chip-remove')
    await submit('edit-coffee-form')

    await vi.waitFor(() => expect(api.edits).toHaveLength(1))
    expect(api.edits[0]).toMatchObject({
      origins: ['CO'],
      regions: [{ origin: 'CO', name: 'Huila' }],
    })
  })

  it('saves the new details and closes', async () => {
    const sheet = await openSheet()

    await type('coffee-name', 'Ayele Fulasa Natural')
    await pickRoaster('la cabra', 'La Cabra')
    await click('coffee-roast-level', 'option-medium')
    await click('coffee-roasted-for', 'option-omni')
    await pickMulti('coffee-producers', 'dieg', 'Diego Bermudez')
    await pickMulti('coffee-processes', 'anaer', 'Anaerobic')
    await pickMulti('coffee-flavor-notes', 'jasm', 'Jasmine')
    await type('coffee-link', '')
    await submit('edit-coffee-form')

    await vi.waitFor(() =>
      expect(sheet.emitted('update:open')).toEqual([[false]]),
    )
    expect(api.edits).toEqual([
      {
        name: 'Ayele Fulasa Natural',
        roaster: 'La Cabra',
        roastLevel: 'medium',
        roastedFor: 'omni',
        origins: ['ET'],
        regions: [{ origin: 'ET', name: 'Guji' }],
        farms: [],
        washingStations: [{ origin: 'ET', name: 'Hambela' }],
        producers: ['Nestor Lasso', 'Diego Bermudez'],
        processes: ['Washed', 'Anaerobic'],
        varietals: ['Geisha'],
        flavorNotes: ['Lime', 'Jasmine'],
        link: null,
        altitudeFrom: 1900,
        altitudeTo: 2200,
      },
    ])
  })

  it('explains a missing name before sending anything', async () => {
    await openSheet()

    await type('coffee-name', ' ')
    await submit('edit-coffee-form')

    await vi.waitFor(() =>
      expect(sheetText()).toContain('Give the coffee a name'),
    )
    expect(api.edits).toEqual([])
  })

  it('shows a name that is taken next to the field', async () => {
    const sheet = await openSheet()

    await type('coffee-name', 'Red Brick')
    await submit('edit-coffee-form')

    await vi.waitFor(() =>
      expect(sheetText()).toContain(
        'Square Mile already has a coffee called Red Brick',
      ),
    )
    expect(sheet.emitted('update:open')).toBeUndefined()
  })

  it('says something went wrong when the server gives no reason', async () => {
    await openSheet()

    await type('coffee-name', 'Crash')
    await submit('edit-coffee-form')

    await vi.waitFor(() =>
      expect(byTestId('form-error')!.textContent?.trim()).toBe(
        'Something went wrong. Try again.',
      ),
    )
  })

  it('asks to close from its close button', async () => {
    const sheet = await openSheet()

    byTestId('edit-coffee-sheet')!
      .querySelector<HTMLElement>('[data-testid="form-sheet-close"]')!
      .click()
    await flushPromises()

    expect(sheet.emitted('update:open')).toEqual([[false]])
  })

  it('throws away unsaved changes when it opens again', async () => {
    const sheet = await openSheet(false)
    await sheet.setProps({ open: true })
    await type('coffee-name', 'Half typed')

    await sheet.setProps({ open: false })
    await sheet.setProps({ open: true })

    expect(inputValue('coffee-name')).toBe('Ayele Fulasa')
  })
})
