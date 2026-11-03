import { describe, expect, it } from 'vitest'
import {
  catalogFromRoute,
  catalogLabels,
  catalogQuery,
  catalogRoute,
  emptyCatalogFilter,
  isCatalogFiltered,
  matchLabels,
} from '~/utils/catalog'
import { catalogCoffee } from '../fake-api'

const laCabra = { value: 'r1', label: 'La Cabra' }

describe('isCatalogFiltered', () => {
  it('knows when any filter is on', () => {
    expect(isCatalogFiltered(emptyCatalogFilter())).toBe(false)
    expect(isCatalogFiltered({ ...emptyCatalogFilter(), mine: true })).toBe(
      true,
    )
    expect(
      isCatalogFiltered({ ...emptyCatalogFilter(), roaster: laCabra }),
    ).toBe(true)
  })
})

describe('catalogQuery', () => {
  it('asks for everything without a search or filters', () => {
    expect(catalogQuery('  ', emptyCatalogFilter())).toEqual({})
  })

  it('asks for the community rating sort, but not for the newest', () => {
    expect(catalogQuery('', emptyCatalogFilter(), 'newest')).toEqual({})
    expect(catalogQuery('', emptyCatalogFilter(), 'communityRating')).toEqual({
      sort: 'communityRating',
    })
  })

  it('asks for what was typed and what the filters pick', () => {
    expect(
      catalogQuery(' lime ', {
        mine: true,
        flavorNote: { value: 'n1', label: 'Lime' },
        origin: { value: 'ET', label: 'Ethiopia' },
        roaster: laCabra,
        process: { value: 's1', label: 'Washed' },
        roastLevel: { value: 'light', label: 'Light' },
        roastedFor: { value: 'filter', label: 'Filter' },
      }),
    ).toEqual({
      search: 'lime',
      mine: 'true',
      flavorNoteId: 'n1',
      originCode: 'ET',
      roasterId: 'r1',
      processId: 's1',
      roastLevel: 'light',
      roastedFor: 'filter',
    })
  })
})

describe('matchLabels', () => {
  it('labels what matched, leaving out the name the result already shows', () => {
    expect(
      matchLabels(
        catalogCoffee({
          matches: [
            { field: 'name', name: 'El Paraiso' },
            { field: 'flavorNote', name: 'Strawberry' },
            { field: 'farm', name: 'Finca El Paraiso' },
          ],
        }),
      ),
    ).toEqual(['Flavor note: Strawberry', 'Farm: Finca El Paraiso'])
  })
})

describe('catalogRoute', () => {
  it('keeps nothing in the address without a search, filters or sort', () => {
    expect(catalogRoute(' ', emptyCatalogFilter(), 'newest')).toEqual({})
  })

  it('keeps the search as q, next to the filters and sort', () => {
    expect(
      catalogRoute(
        ' lime ',
        { ...emptyCatalogFilter(), mine: true, roaster: laCabra },
        'communityRating',
      ),
    ).toEqual({
      q: 'lime',
      mine: 'true',
      roasterId: 'r1',
      sort: 'communityRating',
    })
  })
})

describe('catalogFromRoute', () => {
  it('starts empty without an address to start from', () => {
    expect(catalogFromRoute({}, {})).toEqual({
      search: '',
      filter: emptyCatalogFilter(),
      sort: 'newest',
    })
  })

  it('reads the search, filters and sort, naming each filter', () => {
    expect(
      catalogFromRoute(
        {
          q: 'lime',
          mine: 'true',
          roasterId: 'r1',
          roastLevel: 'light',
          sort: 'communityRating',
        },
        { roasterId: 'La Cabra' },
      ),
    ).toEqual({
      search: 'lime',
      filter: {
        ...emptyCatalogFilter(),
        mine: true,
        roaster: laCabra,
        roastLevel: { value: 'light', label: 'Light' },
      },
      sort: 'communityRating',
    })
  })

  it('drops what it cannot name or does not know', () => {
    const { filter, sort } = catalogFromRoute(
      { roasterId: 'gone', roastLevel: 'burnt', sort: 'oldest' },
      {},
    )

    expect(filter).toEqual(emptyCatalogFilter())
    expect(sort).toBe('newest')
  })
})

describe('catalogLabels', () => {
  it('remembers the names of the filters that need looking up', () => {
    expect(
      catalogLabels({
        ...emptyCatalogFilter(),
        roaster: laCabra,
        roastLevel: { value: 'light', label: 'Light' },
      }),
    ).toEqual({ roasterId: 'La Cabra' })
  })
})
