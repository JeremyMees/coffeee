import { describe, expect, it } from 'vitest'
import {
  emptyLibraryFilter,
  isLibraryFiltered,
  libraryAddress,
  libraryQuery,
  originNames,
} from '~/utils/library'
import { libraryCoffee } from '#test/fixtures/coffees'

const laCabra = { value: 'r1', label: 'La Cabra' }

function state(overrides: Partial<LibraryState> = {}): LibraryState {
  return {
    search: '',
    filter: emptyLibraryFilter(),
    view: 'grid',
    sort: null,
    pageIndex: 0,
    ...overrides,
  }
}

describe('isLibraryFiltered', () => {
  it('knows when Favourites or any filter is on', () => {
    expect(isLibraryFiltered(emptyLibraryFilter())).toBe(false)
    expect(
      isLibraryFiltered({ ...emptyLibraryFilter(), favourites: true }),
    ).toBe(true)
    expect(
      isLibraryFiltered({ ...emptyLibraryFilter(), roaster: [laCabra] }),
    ).toBe(true)
  })
})

describe('libraryQuery', () => {
  it('asks for everything without a search, filters or a sort', () => {
    expect(libraryQuery(' ', emptyLibraryFilter())).toEqual({})
  })

  it('asks for what was typed, Favourites, the filters and sort', () => {
    expect(
      libraryQuery(
        ' lime ',
        {
          ...emptyLibraryFilter(),
          favourites: true,
          roaster: [laCabra],
          varietal: [{ value: 'v1', label: 'Geisha' }],
        },
        { column: 'latestPrice', direction: 'descending' },
      ),
    ).toEqual({
      search: 'lime',
      favourites: 'true',
      roasterId: 'r1',
      varietalId: 'v1',
      sort: 'latestPrice',
      direction: 'descending',
    })
  })
})

describe('originNames', () => {
  it('lists every origin of a blend', () => {
    expect(
      originNames(
        libraryCoffee({
          origins: [
            { code: 'ET', name: 'Ethiopia' },
            { code: 'KE', name: 'Kenya' },
          ],
        }),
      ),
    ).toBe('Ethiopia, Kenya')
  })
})

describe('libraryAddress', () => {
  it('keeps nothing in the address for the plain grid', () => {
    expect(libraryAddress.toRoute(state())).toEqual({})
  })

  it('keeps the search and filters, and the sort and page only for the table', () => {
    const filter = { ...emptyLibraryFilter(), roaster: [laCabra] }
    const sort = { column: 'rating', direction: 'descending' } as const

    expect(
      libraryAddress.toRoute(
        state({ search: ' lime ', filter, sort, pageIndex: 2 }),
      ),
    ).toEqual({ q: 'lime', roasterId: 'r1' })
    expect(
      libraryAddress.toRoute(
        state({ filter, view: 'table', sort, pageIndex: 2 }),
      ),
    ).toEqual({
      roasterId: 'r1',
      view: 'table',
      sort: 'rating',
      direction: 'descending',
      page: '3',
    })
    expect(libraryAddress.toRoute(state({ filter, view: 'table' }))).toEqual({
      roasterId: 'r1',
      view: 'table',
    })
  })

  it('starts as the plain grid without an address to start from', () => {
    expect(libraryAddress.fromRoute({}, {})).toEqual(state())
  })

  it('reads the search, filters, view, sort and page, naming each filter', () => {
    expect(
      libraryAddress.fromRoute(
        {
          q: 'lime',
          favourites: 'true',
          roasterId: 'r1',
          view: 'table',
          sort: 'rating',
          direction: 'descending',
          page: '3',
        },
        { roasterId: { r1: 'La Cabra' } },
      ),
    ).toEqual(
      state({
        search: 'lime',
        filter: {
          ...emptyLibraryFilter(),
          favourites: true,
          roaster: [laCabra],
        },
        view: 'table',
        sort: { column: 'rating', direction: 'descending' },
        pageIndex: 2,
      }),
    )
  })

  it('drops what it cannot name or does not know', () => {
    expect(
      libraryAddress.fromRoute(
        { roasterId: 'gone', view: 'list', sort: 'colour', page: 'two' },
        {},
      ),
    ).toEqual(state())
  })

  it('remembers the names of the picked filters', () => {
    expect(
      libraryAddress.labelsOf(
        state({
          filter: {
            ...emptyLibraryFilter(),
            roaster: [laCabra],
            origin: [{ value: 'ET', label: 'Ethiopia' }],
          },
        }),
      ),
    ).toEqual({
      roasterId: { r1: 'La Cabra' },
      originCode: { ET: 'Ethiopia' },
    })
  })
})
