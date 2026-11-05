import type { InternalApi } from 'nitropack/types'

export interface CatalogState {
  search: string
  filter: BrowsingFilter
  sort: CatalogSort
}

export type CatalogPage = InternalApi['/api/shelves/:shelfId/catalog']['get']

export type CatalogCoffee = CatalogPage['coffees'][number]
