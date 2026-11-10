import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { HeartIcon } from '@lucide/vue'
import BrowsingFilters from '~/components/organisms/BrowsingFilters.vue'
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

const laCabra = { value: 'r1', label: 'La Cabra' }

async function catalogFilters(filter: Partial<BrowsingFilter> = {}) {
  const changes: BrowsingFilter[] = []
  const wrapper = await mountSuspended(BrowsingFilters, {
    props: {
      modelValue: { ...emptyBrowsingFilter(), ...filter },
      'onUpdate:modelValue': (changed: BrowsingFilter) => changes.push(changed),
      shelfId: sarah.shelf.id,
      area: 'catalog',
    },
    attachTo: document.body,
  })

  return { wrapper, changes }
}

async function libraryFilters(filter: Partial<LibraryFilter> = {}) {
  const changes: LibraryFilter[] = []
  const wrapper = await mountSuspended(BrowsingFilters, {
    props: {
      modelValue: { ...emptyLibraryFilter(), ...filter },
      'onUpdate:modelValue': (changed: BrowsingFilter) =>
        changes.push(changed as LibraryFilter),
      shelfId: sarah.shelf.id,
      area: 'library',
      toggle: {
        key: 'favourites' as keyof BrowsingFilter,
        label: 'Favourites',
        icon: HeartIcon,
      },
    },
    attachTo: document.body,
  })

  return { wrapper, changes }
}

describe('BrowsingFilters', () => {
  it('turns its toggle on and shows it as on', async () => {
    const { wrapper, changes } = await libraryFilters()

    await wrapper.get(tid('library-filter-favourites')).trigger('click')

    expect(wrapper.get(tid('library-filter-favourites')).text()).toBe(
      'Favourites',
    )
    expect(changes).toEqual([{ ...emptyLibraryFilter(), favourites: true }])
    expect(
      (await libraryFilters({ favourites: true })).wrapper
        .get(tid('library-filter-favourites'))
        .attributes('aria-pressed'),
    ).toBe('true')
  })

  it('starts with the pickers when it has no toggle', async () => {
    const { wrapper } = await catalogFilters()
    const buttons = wrapper.get(tid('catalog-filters')).findAll('button')

    expect(buttons[0]?.attributes('data-testid')).toBe(
      'catalog-filter-flavor-notes',
    )
    expect(wrapper.find(tid('catalog-filter-mine')).exists()).toBe(false)
  })

  it('clears every filter without a toggle', async () => {
    const { wrapper, changes } = await catalogFilters({ roaster: [laCabra] })

    await wrapper.get(tid('catalog-filter-clear')).trigger('click')

    expect(changes).toEqual([emptyBrowsingFilter()])
  })

  it('has the same chips on Discover and in the Library', async () => {
    const chips = (
      wrapper: { get: (selector: string) => { text: () => string } },
      area: string,
    ) =>
      browsingPickers.map(picker =>
        wrapper.get(tid(`${area}-filter-${picker.kind}`)).text(),
      )
    const expected = [
      'Flavor note',
      'Origin',
      'Roaster',
      'Process',
      'Varietal',
      'Roast level',
      'Roasted for',
    ]

    expect(chips((await catalogFilters()).wrapper, 'catalog')).toEqual(expected)
    expect(chips((await libraryFilters()).wrapper, 'library')).toEqual(expected)
  })

  it('combines a picked chip with the others', async () => {
    const { changes } = await catalogFilters({ roaster: [laCabra] })

    await click('catalog-filter-roasted-for')
    const option = await vi.waitFor(() => {
      const found = allByTestId('catalog-filter-option').find(
        element => element.textContent?.trim() === 'Espresso',
      )
      if (!found) throw new Error('No Espresso option')

      return found
    })
    option.click()

    await vi.waitFor(() =>
      expect(changes).toEqual([
        {
          ...emptyBrowsingFilter(),
          roaster: [laCabra],
          roastedFor: [{ value: 'espresso', label: 'Espresso' }],
        },
      ]),
    )
  })

  it('offers only what the shelf bought in the Library', async () => {
    const tom = await scenario.member('Tom')
    await scenario.coffee(sarah.shelf, { origins: ['ET'] })
    await scenario.coffee(sarah.shelf, { name: 'El Paraiso', origins: ['CO'] })
    await scenario.coffee(tom.shelf, { name: 'Red Brick', origins: ['BR'] })
    const { changes } = await libraryFilters({ favourites: true })

    await click('library-filter-origins')
    await vi.waitFor(() =>
      expect(
        allByTestId('library-filter-option').map(element =>
          element.textContent?.trim(),
        ),
      ).toEqual(['Colombia', 'Ethiopia']),
    )
    await click('library-filter-option')

    expect(changes).toEqual([
      {
        ...emptyLibraryFilter(),
        favourites: true,
        origin: [{ value: 'CO', label: 'Colombia' }],
      },
    ])
  })

  it('shows each picked value as a chip that takes it off', async () => {
    const lime = { value: 'n1', label: 'Lime' }
    const banana = { value: 'n2', label: 'Banana' }
    const { wrapper, changes } = await catalogFilters({
      flavorNote: [lime, banana],
      roaster: [laCabra],
    })
    const applied = () =>
      wrapper.findAll(tid('catalog-applied-filter')).map(chip => chip.text())

    expect(applied()).toEqual([
      'Flavor note: Lime',
      'Flavor note: Banana',
      'Roaster: La Cabra',
    ])
    expect(
      wrapper.get(tid('catalog-applied-filter')).attributes('aria-label'),
    ).toBe('Remove Flavor note: Lime')

    await wrapper.findAll(tid('catalog-applied-filter'))[0]!.trigger('click')

    expect(changes).toEqual([
      { ...emptyBrowsingFilter(), flavorNote: [banana], roaster: [laCabra] },
    ])
  })

  it('shows no picked chips without filters', async () => {
    const { wrapper } = await catalogFilters()

    expect(wrapper.find(tid('catalog-applied')).exists()).toBe(false)
  })

  it('clears every filter and the toggle, and only offers to when one is on', async () => {
    const { wrapper } = await libraryFilters()
    expect(wrapper.find(tid('library-filter-clear')).exists()).toBe(false)

    const filtered = await libraryFilters({
      favourites: true,
      roaster: [laCabra],
    })
    await filtered.wrapper.get(tid('library-filter-clear')).trigger('click')

    expect(filtered.changes).toEqual([emptyLibraryFilter()])
  })

  it('counts every picked value and the toggle on the Filters button', async () => {
    await libraryFilters({
      favourites: true,
      roaster: [laCabra],
      origin: [{ value: 'CO', label: 'Colombia' }],
    })

    expect(byTestId('library-filters-count')!.textContent?.trim()).toBe('3')
  })

  it('picks and clears filters from the sheet on phones', async () => {
    setViewport(390, 844)
    const { changes } = await libraryFilters({ roaster: [laCabra] })

    await click('library-filters-open')
    await click('library-filters-sheet', 'library-filter-favourites')
    await click('library-filters-sheet', 'library-filter-clear')

    expect(changes).toEqual([
      { ...emptyLibraryFilter(), roaster: [laCabra], favourites: true },
      emptyLibraryFilter(),
    ])
  })
})
