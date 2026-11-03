import { describe, expect, it } from 'vitest'
import {
  catalogQuery,
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
