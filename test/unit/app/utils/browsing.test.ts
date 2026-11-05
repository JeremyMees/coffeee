import { describe, expect, it } from 'vitest'
import {
  browsingFromRoute,
  browsingLabels,
  browsingQuery,
  browsingRoute,
  emptyBrowsingFilter,
  isBrowsingFiltered,
  matchLabels,
} from '~/utils/browsing'

const laCabra = { value: 'r1', label: 'La Cabra' }
const lime = { value: 'n1', label: 'Lime' }
const jasmine = { value: 'n2', label: 'Jasmine' }

const everything = {
  flavorNote: [lime],
  origin: [{ value: 'ET', label: 'Ethiopia' }],
  roaster: [laCabra],
  process: [{ value: 's1', label: 'Washed' }],
  varietal: [{ value: 'v1', label: 'Geisha' }],
  roastLevel: [{ value: 'light', label: 'Light' }],
  roastedFor: [{ value: 'filter', label: 'Filter' }],
}

describe('isBrowsingFiltered', () => {
  it('knows when any filter is picked', () => {
    expect(isBrowsingFiltered(emptyBrowsingFilter())).toBe(false)
    expect(
      isBrowsingFiltered({ ...emptyBrowsingFilter(), varietal: [laCabra] }),
    ).toBe(true)
  })
})

describe('browsingQuery', () => {
  it('asks for everything without a search or filters', () => {
    expect(browsingQuery('  ', emptyBrowsingFilter())).toEqual({})
  })

  it('asks for what was typed and what every filter picks', () => {
    expect(browsingQuery(' lime ', everything)).toEqual({
      search: 'lime',
      flavorNoteId: 'n1',
      originCode: 'ET',
      roasterId: 'r1',
      processId: 's1',
      varietalId: 'v1',
      roastLevel: 'light',
      roastedFor: 'filter',
    })
  })

  it('asks for every value of a filter with several picked', () => {
    expect(
      browsingQuery('', {
        ...emptyBrowsingFilter(),
        flavorNote: [lime, jasmine],
      }),
    ).toEqual({ flavorNoteId: ['n1', 'n2'] })
  })
})

describe('browsingRoute', () => {
  it('keeps the search as q, next to the filters', () => {
    expect(
      browsingRoute(' lime ', { ...emptyBrowsingFilter(), roaster: [laCabra] }),
    ).toEqual({ q: 'lime', roasterId: 'r1' })
    expect(browsingRoute(' ', emptyBrowsingFilter())).toEqual({})
  })
})

describe('browsingFromRoute', () => {
  it('reads the search and filters, naming each filter', () => {
    expect(
      browsingFromRoute(
        {
          q: 'lime',
          roasterId: 'r1',
          flavorNoteId: ['n1', 'n2'],
          varietalId: 'v1',
          roastLevel: ['light', 'dark'],
        },
        {
          roasterId: { r1: 'La Cabra' },
          flavorNoteId: { n1: 'Lime', n2: 'Jasmine' },
          varietalId: { v1: 'Geisha' },
        },
      ),
    ).toEqual({
      search: 'lime',
      filter: {
        ...emptyBrowsingFilter(),
        roaster: [laCabra],
        flavorNote: [lime, jasmine],
        varietal: [{ value: 'v1', label: 'Geisha' }],
        roastLevel: [
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ],
      },
    })
  })

  it('drops what it cannot name or does not know', () => {
    expect(
      browsingFromRoute({ roasterId: 'gone', roastLevel: 'burnt' }, {}),
    ).toEqual({ search: '', filter: emptyBrowsingFilter() })
  })
})

describe('browsingLabels', () => {
  it('remembers the names of the filters that need looking up', () => {
    expect(
      browsingLabels({ ...everything, flavorNote: [lime, jasmine] }),
    ).toEqual({
      flavorNoteId: { n1: 'Lime', n2: 'Jasmine' },
      originCode: { ET: 'Ethiopia' },
      roasterId: { r1: 'La Cabra' },
      processId: { s1: 'Washed' },
      varietalId: { v1: 'Geisha' },
    })
  })
})

describe('matchLabels', () => {
  it('labels what matched, leaving out the name the result already shows', () => {
    expect(
      matchLabels({
        matches: [
          { field: 'name', name: 'El Paraiso' },
          { field: 'flavorNotes', name: 'Strawberry' },
          { field: 'farms', name: 'Finca El Paraiso' },
          { field: 'varietals', name: 'Geisha' },
          { field: 'washingStations', name: 'Kochere' },
        ],
      }),
    ).toEqual([
      'Flavor note: Strawberry',
      'Farm: Finca El Paraiso',
      'Varietal: Geisha',
      'Washing station: Kochere',
    ])
  })
})
