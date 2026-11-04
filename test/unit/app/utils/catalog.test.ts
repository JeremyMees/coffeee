import { describe, expect, it } from 'vitest'
import {
  catalogAddress,
  catalogQuery,
  emptyCatalogFilter,
  isCatalogFiltered,
} from '~/utils/catalog'

const laCabra = { value: 'r1', label: 'La Cabra' }

describe('isCatalogFiltered', () => {
  it('knows when Mine or any filter is on', () => {
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

  it('asks for what was typed, Mine and the filters', () => {
    expect(
      catalogQuery(' lime ', {
        ...emptyCatalogFilter(),
        mine: true,
        roaster: laCabra,
      }),
    ).toEqual({ search: 'lime', mine: 'true', roasterId: 'r1' })
  })
})

describe('catalogAddress', () => {
  it('keeps nothing in the address without a search, filters or sort', () => {
    expect(
      catalogAddress.toRoute({
        search: ' ',
        filter: emptyCatalogFilter(),
        sort: 'newest',
      }),
    ).toEqual({})
  })

  it('keeps the search as q, next to Mine, the filters and sort', () => {
    expect(
      catalogAddress.toRoute({
        search: ' lime ',
        filter: { ...emptyCatalogFilter(), mine: true, roaster: laCabra },
        sort: 'communityRating',
      }),
    ).toEqual({
      q: 'lime',
      mine: 'true',
      roasterId: 'r1',
      sort: 'communityRating',
    })
  })

  it('starts empty without an address to start from', () => {
    expect(catalogAddress.fromRoute({}, {})).toEqual({
      search: '',
      filter: emptyCatalogFilter(),
      sort: 'newest',
    })
  })

  it('reads the search, Mine, filters and sort', () => {
    expect(
      catalogAddress.fromRoute(
        { q: 'lime', mine: 'true', roasterId: 'r1', sort: 'communityRating' },
        { roasterId: 'La Cabra' },
      ),
    ).toEqual({
      search: 'lime',
      filter: { ...emptyCatalogFilter(), mine: true, roaster: laCabra },
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
        filter: { ...emptyCatalogFilter(), roaster: laCabra },
        sort: 'newest',
      }),
    ).toEqual({ roasterId: 'La Cabra' })
  })
})
