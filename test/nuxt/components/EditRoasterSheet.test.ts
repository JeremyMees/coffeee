import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import EditRoasterSheet from '~/components/EditRoasterSheet.vue'
import { api, fakeApi, resetApi, squareMile } from '../fake-api'
import { byTestId, inputValue, submit, type } from '../fixtures'

fakeApi()

beforeEach(resetApi)

async function openSheet() {
  const sheet = await mountSuspended(EditRoasterSheet, {
    props: { shelfId: 'home', roaster: squareMile(), open: true },
    attachTo: document.body,
  })

  await vi.waitFor(
    () => expect(byTestId('edit-roaster-form')).not.toBeNull(),
    3000,
  )

  return sheet
}

async function pickCountry(code: string) {
  const select = byTestId<HTMLSelectElement>('roaster-country')!
  select.value = code
  select.dispatchEvent(new Event('change', { bubbles: true }))
  await flushPromises()
}

function sheetText() {
  return byTestId('edit-roaster-sheet')!.textContent
}

describe('EditRoasterSheet', () => {
  it('opens with the current details filled in', async () => {
    await openSheet()

    expect(inputValue('roaster-name')).toBe('Square Mile')
    expect(inputValue('roaster-website')).toBe(
      'https://www.squaremilecoffee.com',
    )
    expect(byTestId<HTMLSelectElement>('roaster-country')!.value).toBe('GB')
    expect(inputValue('roaster-city')).toBe('London')
    expect(byTestId('roaster-logo-field')).not.toBeNull()
  })

  it('saves the new details and closes', async () => {
    const sheet = await openSheet()

    await type('roaster-name', 'Square Mile Coffee Roasters')
    await type('roaster-website', '')
    await pickCountry('IE')
    await type('roaster-city', 'Dublin')
    await submit('edit-roaster-form')

    await vi.waitFor(() =>
      expect(sheet.emitted('update:open')).toEqual([[false]]),
    )
    expect(api.roasterCalls).toEqual([
      {
        edit: {
          name: 'Square Mile Coffee Roasters',
          website: null,
          countryCode: 'IE',
          city: 'Dublin',
        },
      },
    ])
  })

  it('clears the country', async () => {
    await openSheet()

    await pickCountry('')
    await submit('edit-roaster-form')

    await vi.waitFor(() =>
      expect(api.roasterCalls).toEqual([
        {
          edit: expect.objectContaining({ countryCode: null }),
        },
      ]),
    )
  })

  it('explains a missing name before sending anything', async () => {
    await openSheet()

    await type('roaster-name', '')
    await submit('edit-roaster-form')

    await vi.waitFor(() =>
      expect(sheetText()).toContain('Give the roaster a name'),
    )
    expect(api.roasterCalls).toEqual([])
  })

  it('shows a name that is taken next to the field', async () => {
    await openSheet()

    await type('roaster-name', 'La Cabra')
    await submit('edit-roaster-form')

    await vi.waitFor(() =>
      expect(sheetText()).toContain(
        'There is already a roaster called La Cabra',
      ),
    )
    expect(byTestId('form-error')).toBeNull()
  })

  it('says why the roaster could not be saved', async () => {
    api.roasterFails = true
    await openSheet()

    await submit('edit-roaster-form')

    await vi.waitFor(() =>
      expect(byTestId('form-error')!.textContent?.trim()).toBe(
        'Only the person who added this roaster or an admin can edit it',
      ),
    )
  })
})
