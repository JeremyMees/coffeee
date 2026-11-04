import { describe, expect, it } from 'vitest'
import {
  emptyLibraryFilter,
  isLibraryFiltered,
  libraryFromRoute,
  libraryLabels,
  libraryQuery,
  libraryRoute,
  originNames,
} from '~/utils/library'
import { libraryCoffee } from '#test/fixtures/coffees'

const laCabra = { value: 'r1', label: 'La Cabra' }

describe('isLibraryFiltered', () => {
  it('knows when any filter is on', () => {
    expect(isLibraryFiltered(emptyLibraryFilter())).toBe(false)
    expect(
      isLibraryFiltered({ ...emptyLibraryFilter(), favourites: true }),
    ).toBe(true)
    expect(
      isLibraryFiltered({ ...emptyLibraryFilter(), roaster: laCabra }),
    ).toBe(true)
  })
})

describe('libraryQuery', () => {
  it('asks for everything without filters or a sort', () => {
    expect(libraryQuery(emptyLibraryFilter())).toEqual({})
  })

  it('asks for what the filters and sort pick', () => {
    expect(
      libraryQuery(
        {
          favourites: true,
          roaster: laCabra,
          flavorNote: { value: 'n1', label: 'Lime' },
          origin: { value: 'ET', label: 'Ethiopia' },
        },
        { column: 'latestPrice', direction: 'descending' },
      ),
    ).toEqual({
      favourites: 'true',
      roasterId: 'r1',
      flavorNoteId: 'n1',
      originCode: 'ET',
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

describe('libraryRoute', () => {
  it('keeps nothing in the address for the plain grid', () => {
    expect(libraryRoute(emptyLibraryFilter(), 'grid', null, 0)).toEqual({})
  })

  it('keeps the filters, and the sort and page only for the table', () => {
    const filter = { ...emptyLibraryFilter(), roaster: laCabra }
    const sort = { column: 'rating', direction: 'descending' } as const

    expect(libraryRoute(filter, 'grid', sort, 2)).toEqual({ roasterId: 'r1' })
    expect(libraryRoute(filter, 'table', sort, 2)).toEqual({
      roasterId: 'r1',
      view: 'table',
      sort: 'rating',
      direction: 'descending',
      page: '3',
    })
    expect(libraryRoute(filter, 'table', null, 0)).toEqual({
      roasterId: 'r1',
      view: 'table',
    })
  })
})

describe('libraryFromRoute', () => {
  it('starts as the plain grid without an address to start from', () => {
    expect(libraryFromRoute({}, {})).toEqual({
      filter: emptyLibraryFilter(),
      view: 'grid',
      sort: null,
      pageIndex: 0,
    })
  })

  it('reads the filters, view, sort and page, naming each filter', () => {
    expect(
      libraryFromRoute(
        {
          favourites: 'true',
          roasterId: 'r1',
          view: 'table',
          sort: 'rating',
          direction: 'descending',
          page: '3',
        },
        { roasterId: 'La Cabra' },
      ),
    ).toEqual({
      filter: { ...emptyLibraryFilter(), favourites: true, roaster: laCabra },
      view: 'table',
      sort: { column: 'rating', direction: 'descending' },
      pageIndex: 2,
    })
  })

  it('drops what it cannot name or does not know', () => {
    expect(
      libraryFromRoute(
        { roasterId: 'gone', view: 'list', sort: 'colour', page: 'two' },
        {},
      ),
    ).toEqual({
      filter: emptyLibraryFilter(),
      view: 'grid',
      sort: null,
      pageIndex: 0,
    })
  })
})

describe('libraryLabels', () => {
  it('remembers the names of the picked filters', () => {
    expect(
      libraryLabels({
        ...emptyLibraryFilter(),
        roaster: laCabra,
        origin: { value: 'ET', label: 'Ethiopia' },
      }),
    ).toEqual({ roasterId: 'La Cabra', originCode: 'Ethiopia' })
  })
})
