import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { eq } from 'drizzle-orm'
import EditRoasterSheet from '~/components/EditRoasterSheet.vue'
import type { ShelfRoaster } from '#imports'
import { roaster } from '#server/db/schemas'
import type { Member } from '#test/support/types'
import { byTestId, inputValue, submit, type } from '../fixtures'
import { database, scenario, signIn } from '../server'

let sarah: Member
let squareMile: string

const squareMileDetails = {
  name: 'Square Mile',
  website: 'https://www.squaremilecoffee.com',
  countryCode: 'GB',
  city: 'London',
} as const

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  squareMile = await scenario.roaster(sarah, 'Square Mile')
  await scenario.roasterDetails(sarah, squareMile, squareMileDetails)
  await signIn(sarah)
})

async function stored(roasterId = squareMile) {
  const db = await database()
  const [found] = await db
    .select({
      name: roaster.name,
      website: roaster.website,
      countryCode: roaster.countryCode,
      city: roaster.city,
    })
    .from(roaster)
    .where(eq(roaster.id, roasterId))

  return found!
}

async function openSheet(roasterId = squareMile) {
  const sheet = await mountSuspended(EditRoasterSheet, {
    props: {
      roaster: await $fetch<ShelfRoaster>(`/api/roasters/${roasterId}`),
      open: true,
    },
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
    expect(await stored()).toEqual({
      name: 'Square Mile Coffee Roasters',
      website: null,
      countryCode: 'IE',
      city: 'Dublin',
    })
  })

  it('clears the country', async () => {
    await openSheet()

    await pickCountry('')
    await submit('edit-roaster-form')

    await vi.waitFor(async () =>
      expect(await stored()).toEqual({
        ...squareMileDetails,
        countryCode: null,
      }),
    )
  })

  it('explains a missing name before sending anything', async () => {
    const sheet = await openSheet()

    await type('roaster-name', '')
    await submit('edit-roaster-form')

    await vi.waitFor(() =>
      expect(sheetText()).toContain('Give the roaster a name'),
    )
    expect(sheet.emitted('update:open')).toBeUndefined()
    expect(await stored()).toEqual(squareMileDetails)
  })

  it('shows a name that is taken next to the field', async () => {
    await scenario.roaster(sarah, 'La Cabra')
    await openSheet()

    await type('roaster-name', 'La Cabra')
    await submit('edit-roaster-form')

    await vi.waitFor(() =>
      expect(sheetText()).toContain(
        'There is already a roaster called La Cabra',
      ),
    )
    expect(byTestId('form-error')).toBeNull()
    expect(await stored()).toEqual(squareMileDetails)
  })

  it('says why the roaster could not be saved', async () => {
    const tom = await scenario.member('Tom')
    const laCabra = await scenario.roaster(tom, 'La Cabra')
    await openSheet(laCabra)

    await submit('edit-roaster-form')

    await vi.waitFor(() =>
      expect(byTestId('form-error')!.textContent?.trim()).toBe(
        'Only the person who added this roaster or an admin can edit it',
      ),
    )
  })
})
