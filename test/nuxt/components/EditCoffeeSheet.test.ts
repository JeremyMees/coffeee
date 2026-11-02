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
  pickRoaster,
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
  roastLevel: 'light',
  roastedFor: 'filter',
  colour: '#2f6f4f',
} as const

async function openSheet(open = true) {
  const sheet = await mountSuspended(EditCoffeeSheet, {
    route: '/shelves/home/coffees/c1',
    props: { shelfId: 'home', coffee, open },
    attachTo: document.body,
  })

  if (open) {
    await vi.waitFor(() => expect(byTestId('edit-coffee-form')).not.toBeNull())
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
    expect(isChecked('coffee-colour', 'colour-forest')).toBe(true)
  })

  it('saves the new details and closes', async () => {
    const sheet = await openSheet()

    await type('coffee-name', 'Ayele Fulasa Natural')
    await pickRoaster('la cabra', 'La Cabra')
    await click('coffee-roast-level', 'option-medium')
    await click('coffee-roasted-for', 'option-omni')
    await click('coffee-colour', 'colour-ink')
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
        colour: '#1d1d1f',
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
      .querySelector<HTMLElement>('[data-slot="sheet-close"]')!
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
