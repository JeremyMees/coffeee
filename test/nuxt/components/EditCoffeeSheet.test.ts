import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { eq } from 'drizzle-orm'
import EditCoffeeSheet from '~/components/EditCoffeeSheet.vue'
import { shelfCoffeePath } from '#imports'
import { coffee, roaster } from '#server/db/schemas'
import { descriptionOf } from '#server/utils/descriptions'
import type { Member } from '#test/support/types'
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
  type,
} from '../fixtures'
import { database, failRequest, scenario, signIn } from '../server'

let sarah: Member
let ayele: Awaited<ReturnType<typeof scenario.coffee>>

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  const tom = await scenario.member('Tom')
  await scenario.coffee(tom.shelf, {
    name: 'Red Brick',
    origins: ['CO'],
    regions: [{ origin: 'CO', name: 'Huila' }],
    producers: ['Diego Bermudez'],
    flavorNotes: ['Jasmine'],
  })
  await scenario.roaster(tom, 'La Cabra')
  ayele = await scenario.coffee(sarah.shelf, {
    regions: [{ origin: 'ET', name: 'Guji' }],
    washingStations: [{ origin: 'ET', name: 'Hambela' }],
    producers: ['Nestor Lasso'],
    varietals: ['Geisha'],
    flavorNotes: ['Lime'],
    link: 'https://example.com/ayele',
    altitudeFrom: 1900,
    altitudeTo: 2200,
  })
  await signIn(sarah)
})

async function savedCoffee() {
  const db = await database()
  const [found] = await db
    .select({
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
    .where(eq(coffee.id, ayele.id))
  const description = await descriptionOf(db, ayele.id)
  const names = (entries: { name: string }[]) =>
    entries.map(entry => entry.name)

  return {
    ...found!,
    origins: description.origins.map(origin => origin.code),
    regions: description.regions.map(({ origin, name }) => ({ origin, name })),
    farms: description.farms.map(({ origin, name }) => ({ origin, name })),
    washingStations: description.washingStations.map(({ origin, name }) => ({
      origin,
      name,
    })),
    producers: names(description.producers),
    processes: names(description.processes),
    varietals: names(description.varietals),
    flavorNotes: names(description.flavorNotes),
  }
}

async function openSheet(open = true) {
  const editable = await $fetch(
    `/api/shelves/${sarah.shelf.id}/coffees/${ayele.id}`,
  )
  const sheet = await mountSuspended(EditCoffeeSheet, {
    route: shelfCoffeePath(sarah.shelf, ayele),
    props: { shelfId: sarah.shelf.id, coffee: editable, open },
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

    await vi.waitFor(async () =>
      expect(await savedCoffee()).toMatchObject({
        origins: ['CO'],
        regions: [{ origin: 'CO', name: 'Huila' }],
      }),
    )
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
    expect(await savedCoffee()).toEqual({
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
    })
  })

  it('explains a missing name before sending anything', async () => {
    await openSheet()

    await type('coffee-name', ' ')
    await submit('edit-coffee-form')

    await vi.waitFor(() =>
      expect(sheetText()).toContain('Give the coffee a name'),
    )
    expect((await savedCoffee()).name).toBe('Ayele Fulasa')
  })

  it('has the steps of a coffee without a first bag, saving from any of them', async () => {
    await openSheet()

    expect(byTestId('edit-coffee-steps')!.textContent).not.toContain(
      'First bag',
    )
    await click('edit-coffee-next')

    expect(byTestId('edit-coffee-pane-2')!.style.display).toBe('')
    expect(byTestId('edit-coffee-submit')).not.toBeNull()
  })

  it('goes back to the step with a problem when saving', async () => {
    await openSheet()
    await type('coffee-name', ' ')
    await click('edit-coffee-next')
    await click('edit-coffee-next')

    await submit('edit-coffee-form')

    await vi.waitFor(() =>
      expect(byTestId('edit-coffee-pane-1')!.style.display).toBe(''),
    )
    expect(byTestId('edit-coffee-pane-3')!.style.display).toBe('none')
    expect(byTestId('edit-coffee-step-1')!.dataset.failing).toBe('true')
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
    expect((await savedCoffee()).name).toBe('Ayele Fulasa')
  })

  it('says something went wrong when the server gives no reason', async () => {
    failRequest('PATCH', `/api/shelves/${sarah.shelf.id}/coffees/${ayele.id}`, {
      status: 500,
      message: '',
    })
    await openSheet()

    await type('coffee-name', 'Ayele Fulasa Natural')
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
