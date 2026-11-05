import { describe, expect, it } from 'vitest'
import { emptyBrowsingFilter } from '~/utils/browsing'
import { emptyLibraryFilter } from '~/utils/library'
import {
  catalogAddress,
  catalogCoffeePath,
  catalogQuery,
  discoverLink,
} from '~/utils/catalog'

const laCabra = { value: 'r1', label: 'La Cabra' }
const shelf = { id: 's1', name: 'Home' }

describe('catalogQuery', () => {
  it('asks for everything without a search or filters', () => {
    expect(catalogQuery('  ', emptyBrowsingFilter())).toEqual({})
  })

  it('asks for the community rating sort, but not for the newest', () => {
    expect(catalogQuery('', emptyBrowsingFilter(), 'newest')).toEqual({})
    expect(catalogQuery('', emptyBrowsingFilter(), 'communityRating')).toEqual({
      sort: 'communityRating',
    })
  })

  it('asks for what was typed and the filters', () => {
    expect(
      catalogQuery(' lime ', { ...emptyBrowsingFilter(), roaster: laCabra }),
    ).toEqual({ search: 'lime', roasterId: 'r1' })
  })
})

describe('catalogAddress', () => {
  it('keeps nothing in the address without a search, filters or sort', () => {
    expect(
      catalogAddress.toRoute({
        search: ' ',
        filter: emptyBrowsingFilter(),
        sort: 'newest',
      }),
    ).toEqual({})
  })

  it('keeps the search as q, next to the filters and sort', () => {
    expect(
      catalogAddress.toRoute({
        search: ' lime ',
        filter: { ...emptyBrowsingFilter(), roaster: laCabra },
        sort: 'communityRating',
      }),
    ).toEqual({ q: 'lime', roasterId: 'r1', sort: 'communityRating' })
  })

  it('starts empty without an address to start from', () => {
    expect(catalogAddress.fromRoute({}, {})).toEqual({
      search: '',
      filter: emptyBrowsingFilter(),
      sort: 'newest',
    })
  })

  it('reads the search, filters and sort, and ignores Mine from old links', () => {
    expect(
      catalogAddress.fromRoute(
        { q: 'lime', mine: 'true', roasterId: 'r1', sort: 'communityRating' },
        { roasterId: 'La Cabra' },
      ),
    ).toEqual({
      search: 'lime',
      filter: { ...emptyBrowsingFilter(), roaster: laCabra },
      sort: 'communityRating',
    })
  })

  it('falls back to the newest for a sort it does not know', () => {
    expect(catalogAddress.fromRoute({ sort: 'oldest' }, {}).sort).toBe('newest')
  })

  it('remembers the names of the picked filters', () => {
    expect(
      catalogAddress.labelsOf({
        search: '',
        filter: { ...emptyBrowsingFilter(), roaster: laCabra },
        sort: 'newest',
      }),
    ).toEqual({ roasterId: 'La Cabra' })
  })
})

describe('catalogCoffeePath', () => {
  it('opens a coffee the shelf bought on the shelf, and any other in the catalog', () => {
    const coffee = { id: 'c1', name: 'Ayele Fulasa' }

    expect(catalogCoffeePath(shelf, { ...coffee, onShelf: true })).toBe(
      '/shelves/home-s1/coffees/ayele-fulasa-c1',
    )
    expect(catalogCoffeePath(shelf, { ...coffee, onShelf: false })).toBe(
      '/coffees/ayele-fulasa-c1',
    )
  })
})

describe('discoverLink', () => {
  it('opens Discover on the shelf with the same search and filters', () => {
    expect(
      discoverLink(shelf, ' lime ', {
        ...emptyBrowsingFilter(),
        roaster: laCabra,
        roastedFor: { value: 'espresso', label: 'Espresso' },
      }),
    ).toEqual({
      path: '/shelves/home-s1/discover',
      query: { q: 'lime', roasterId: 'r1', roastedFor: 'espresso' },
    })
  })

  it('leaves out Favourites, which only the Library has', () => {
    const filter: LibraryFilter = { ...emptyLibraryFilter(), favourites: true }

    expect(discoverLink(shelf, '', filter)).toEqual({
      path: '/shelves/home-s1/discover',
      query: {},
    })
  })
})
