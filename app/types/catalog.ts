import type { InternalApi } from 'nitropack/types'
import type { catalogPickers } from '~/utils/catalog'

export interface CatalogFilter {
  mine: boolean
  flavorNote: LibraryOption | null
  origin: LibraryOption | null
  roaster: LibraryOption | null
  process: LibraryOption | null
  roastLevel: LibraryOption | null
  roastedFor: LibraryOption | null
}

export type CatalogPicker = (typeof catalogPickers)[number]

export type CatalogPage = InternalApi['/api/shelves/:shelfId/catalog']['get']

export type CatalogCoffee = CatalogPage['coffees'][number]
