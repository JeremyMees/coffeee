import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { SortingState } from '@tanstack/vue-table'
import LibraryTable from '~/components/organisms/LibraryTable.vue'
import { tid } from '../../fixtures'
import { libraryCoffee, libraryCoffees } from '#test/fixtures/coffees'

async function table(
  sorting: SortingState = [],
  scope: LibraryScope = 'bought',
) {
  const sortings: SortingState[] = []
  const wrapper = await mountSuspended(LibraryTable, {
    props: {
      coffees: libraryCoffees(),
      total: 3,
      shelf: { id: 'home', name: "Sarah's shelf" },
      scope,
      sorting,
      'onUpdate:sorting': (changed: SortingState) => sortings.push(changed),
      pagination: { pageIndex: 0, pageSize: libraryPageSize },
    },
  })

  return { wrapper, sortings }
}

describe('LibraryTable', () => {
  it('shows a row per coffee that opens it', async () => {
    const { wrapper } = await table()
    const [row] = wrapper.findAll(tid('data-table-row'))
    const cell = (column: string) =>
      row!.get(tid(`data-table-cell-${column}`)).text()

    expect(row!.get(tid('library-row-name')).attributes('href')).toBe(
      '/shelves/sarahs-shelf-home/coffees/ayele-fulasa-c1',
    )
    expect(cell('name')).toBe('Ayele Fulasa')
    expect(row!.get(tid('rating-stars')).attributes('aria-label')).toBe(
      '5 stars',
    )
    expect(cell('roaster')).toBe('Square Mile')
    expect(cell('origin')).toBe('Ethiopia')
    expect(cell('roastLevel')).toBe('Light')
    expect(cell('roastedFor')).toBe('Filter')
    expect(row!.get(tid('data-table-cell-communityRating')).text()).toBeTruthy()
    expect(row!.find(tid('library-row-bought')).exists()).toBe(false)
    expect(cell('latestPrice')).toMatch(/^€\s?16\.50$/)
    expect(cell('lastBought')).toBe(formatDate('2026-11-01', 'en-US'))
  })

  it('says what nobody wrote down', async () => {
    const { wrapper } = await table()
    const row = wrapper.findAll(tid('data-table-row'))[2]!

    expect(row.get(tid('data-table-cell-origin')).text()).toBe('Unknown')
    expect(row.get(tid('data-table-cell-latestPrice')).text()).toBe('Unknown')
  })

  it('shows empty stars for a coffee that is not yet rated', async () => {
    const { wrapper } = await table()
    const stars = wrapper
      .findAll(tid('data-table-row'))[2]!
      .get(tid('data-table-cell-rating', 'rating-stars'))

    expect(stars.attributes('aria-label')).toBe('Not yet rated')
    expect(stars.findAll('svg')).toHaveLength(5)
    expect(stars.findAll('svg.fill-current')).toHaveLength(0)
  })

  it('has a sortable column for each fact', async () => {
    const { wrapper } = await table()

    expect(
      wrapper
        .findAll('[data-testid^="library-sort-"]')
        .map(header => header.text()),
    ).toEqual([
      'Roaster',
      'Origin',
      'Roast level',
      'Roasted for',
      'Your rating',
      'Community rating',
      'Latest price',
      'Last bought',
    ])
  })

  it('leaves out the price and last bought for all coffees, and marks the bought ones', async () => {
    const { wrapper } = await table([], 'all')

    expect(
      wrapper
        .findAll('[data-testid^="library-sort-"]')
        .map(header => header.text()),
    ).not.toContain('Latest price')
    expect(wrapper.find(tid('data-table-cell-lastBought')).exists()).toBe(false)
    expect(wrapper.findAll(tid('library-row-bought'))).toHaveLength(3)
    expect(wrapper.get(tid('library-row-bought')).text()).toBe('Bought')
  })

  it('opens a coffee nobody on the shelf bought in the catalog', async () => {
    const wrapper = await mountSuspended(LibraryTable, {
      props: {
        coffees: [libraryCoffee({ onShelf: false, lastBought: null })],
        total: 1,
        shelf: { id: 'home', name: "Sarah's shelf" },
        scope: 'all',
        sorting: [],
        pagination: { pageIndex: 0, pageSize: libraryPageSize },
      },
    })

    expect(wrapper.get(tid('library-row-name')).attributes('href')).toBe(
      '/coffees/ayele-fulasa-c1',
    )
    expect(wrapper.find(tid('library-row-bought')).exists()).toBe(false)
  })

  it('sorts by a column ascending, then descending, then not at all', async () => {
    const ascending = await table()
    await ascending.wrapper.get(tid('library-sort-roaster')).trigger('click')

    const descending = await table([{ id: 'roaster', desc: false }])
    await descending.wrapper.get(tid('library-sort-roaster')).trigger('click')

    const unsorted = await table([{ id: 'roaster', desc: true }])
    await unsorted.wrapper.get(tid('library-sort-roaster')).trigger('click')

    expect(ascending.sortings).toEqual([[{ id: 'roaster', desc: false }]])
    expect(descending.sortings).toEqual([[{ id: 'roaster', desc: true }]])
    expect(unsorted.sortings).toEqual([[]])
  })
})
