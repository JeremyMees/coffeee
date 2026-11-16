import { describe, expect, it } from 'vitest'
import {
  defaultSortFor,
  emptyLibraryFilter,
  isLibraryFiltered,
  libraryAddress,
  libraryQuery,
  originNames,
  sortIn,
  sortsFor,
} from '~/utils/library'
import { libraryCoffee } from '#test/fixtures/coffees'

const laCabra = { value: 'r1', label: 'La Cabra' }

function state(overrides: Partial<LibraryState> = {}): LibraryState {
  return {
    search: '',
    filter: emptyLibraryFilter(),
    scope: 'all',
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
  it('asks for every coffee without a search, filters or a sort', () => {
    expect(libraryQuery(' ', emptyLibraryFilter(), 'all')).toEqual({})
  })

  it('asks for the bought coffees, what was typed, Favourites, the filters and sort', () => {
    expect(
      libraryQuery(
        ' lime ',
        {
          ...emptyLibraryFilter(),
          favourites: true,
          roaster: [laCabra],
          varietal: [{ value: 'v1', label: 'Geisha' }],
        },
        'bought',
        { column: 'latestPrice', direction: 'descending' },
      ),
    ).toEqual({
      search: 'lime',
      bought: 'true',
      favourites: 'true',
      roasterId: 'r1',
      varietalId: 'v1',
      sort: 'latestPrice',
      direction: 'descending',
    })
  })
})

describe('sortsFor', () => {
  it('sorts by price and last bought only on the Bought side', () => {
    expect(sortsFor('all')).not.toContain('latestPrice')
    expect(sortsFor('all')).not.toContain('lastBought')
    expect(sortsFor('bought')).toContain('latestPrice')
    expect(sortsFor('bought')).toContain('lastBought')
  })

  it('starts all coffees at the newest and the bought ones at last bought', () => {
    expect(defaultSortFor('all')).toBe('newest')
    expect(defaultSortFor('bought')).toBe('lastBought')
  })
})

describe('sortIn', () => {
  it('keeps a sort the side has and drops one it does not', () => {
    const rating = { column: 'rating', direction: 'descending' } as const
    const price = { column: 'latestPrice', direction: 'ascending' } as const

    expect(sortIn('all', rating)).toEqual(rating)
    expect(sortIn('all', price)).toBeNull()
    expect(sortIn('bought', price)).toEqual(price)
    expect(sortIn('all', null)).toBeNull()
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

  it('keeps the side, search, filters and sort, and the page only for the table', () => {
    const filter = { ...emptyLibraryFilter(), roaster: [laCabra] }
    const sort = { column: 'rating', direction: 'descending' } as const

    expect(
      libraryAddress.toRoute(
        state({ search: ' lime ', filter, sort, pageIndex: 2 }),
      ),
    ).toEqual({
      q: 'lime',
      roasterId: 'r1',
      sort: 'rating',
      direction: 'descending',
    })
    expect(
      libraryAddress.toRoute(
        state({ filter, scope: 'bought', view: 'table', sort, pageIndex: 2 }),
      ),
    ).toEqual({
      scope: 'bought',
      roasterId: 'r1',
      sort: 'rating',
      direction: 'descending',
      view: 'table',
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
          scope: 'bought',
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
        scope: 'bought',
        view: 'table',
        sort: { column: 'rating', direction: 'descending' },
        pageIndex: 2,
      }),
    )
  })

  it('drops what it cannot name or does not know', () => {
    expect(
      libraryAddress.fromRoute(
        {
          scope: 'mine',
          roasterId: 'gone',
          view: 'list',
          sort: 'colour',
          page: 'two',
        },
        {},
      ),
    ).toEqual(state())
  })

  it('opens the Bought side for a sort only it has, in its natural direction', () => {
    expect(libraryAddress.fromRoute({ sort: 'lastBought' }, {})).toEqual(
      state({
        scope: 'bought',
        sort: { column: 'lastBought', direction: 'descending' },
      }),
    )
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
