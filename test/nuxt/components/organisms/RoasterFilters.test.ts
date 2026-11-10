import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import RoasterFilters from '~/components/organisms/RoasterFilters.vue'
import type { OriginCode } from '#shared/types/origins'
import type { Member } from '#test/support/types'
import { allByTestId, byTestId, click, setViewport, tid } from '../../fixtures'
import { scenario, signIn } from '../../server'

let sarah: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  await signIn(sarah)
})

afterEach(() => {
  setViewport(1024, 768)
})

const denmark = { value: 'DK', label: 'Denmark' }
const unitedKingdom = { value: 'GB', label: 'United Kingdom' }

async function filters(filter: Partial<RoasterFilter> = {}) {
  const changes: RoasterFilter[] = []
  const wrapper = await mountSuspended(RoasterFilters, {
    props: {
      modelValue: { ...emptyRoasterFilter(), ...filter },
      'onUpdate:modelValue': (changed: RoasterFilter) => changes.push(changed),
      shelfId: sarah.shelf.id,
    },
    attachTo: document.body,
  })

  return { wrapper, changes }
}

async function placedRoaster(name: string, countryCode: OriginCode) {
  const id = await scenario.roaster(sarah, name)
  await scenario.roasterDetails(sarah, id, {
    name,
    website: null,
    countryCode,
    city: null,
  })
}

describe('RoasterFilters', () => {
  it('has Bought from and Country', async () => {
    const { wrapper } = await filters()

    expect(
      wrapper
        .get(tid('roasters-filters'))
        .findAll('button')
        .map(button => button.text()),
    ).toEqual(['Bought from', 'Country'])
    expect(wrapper.find(tid('roasters-applied')).exists()).toBe(false)
  })

  it('turns Bought from on', async () => {
    const { changes } = await filters({ country: [denmark] })

    await click('roasters-filter-bought-from')

    expect(changes).toEqual([{ country: [denmark], boughtFrom: true }])
  })

  it('offers the countries the roasters are in and picks one', async () => {
    await placedRoaster('La Cabra', 'DK')
    await placedRoaster('Square Mile', 'GB')
    const { changes } = await filters({ boughtFrom: true })

    await click('roasters-filter-countries')
    await vi.waitFor(() =>
      expect(
        allByTestId('roasters-filter-option').map(option =>
          option.textContent?.trim(),
        ),
      ).toEqual(['Denmark', 'United Kingdom']),
    )
    await click('roasters-filter-option')

    expect(changes).toEqual([{ country: [denmark], boughtFrom: true }])
  })

  it('shows each picked country as a chip that takes it off', async () => {
    const { wrapper, changes } = await filters({
      country: [denmark, unitedKingdom],
    })

    expect(
      wrapper.findAll(tid('roasters-applied-filter')).map(chip => chip.text()),
    ).toEqual(['Country: Denmark', 'Country: United Kingdom'])

    await wrapper.findAll(tid('roasters-applied-filter'))[0]!.trigger('click')

    expect(changes).toEqual([{ country: [unitedKingdom], boughtFrom: false }])
  })

  it('clears every filter', async () => {
    const { wrapper, changes } = await filters({
      country: [denmark],
      boughtFrom: true,
    })

    await wrapper.get(tid('roasters-filter-clear')).trigger('click')

    expect(changes).toEqual([emptyRoasterFilter()])
  })

  it('counts the countries and Bought from on the Filters button', async () => {
    await filters({ country: [denmark, unitedKingdom], boughtFrom: true })

    expect(byTestId('roasters-filters-count')!.textContent?.trim()).toBe('3')
  })

  it('picks from the sheet on phones', async () => {
    setViewport(390, 844)
    const { changes } = await filters()

    await click('roasters-filters-open')
    await click('roasters-filters-sheet', 'roasters-filter-bought-from')

    expect(changes).toEqual([{ country: [], boughtFrom: true }])
  })
})
