import { describe, expect, it } from 'vitest'
import {
  emptyLibraryFilter,
  isLibraryFiltered,
  libraryQuery,
  originNames,
} from '~/utils/library'
import { libraryCoffee } from '../fake-api'

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
