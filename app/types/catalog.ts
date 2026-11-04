import type { InternalApi } from 'nitropack/types'

export interface CatalogFilter extends BrowsingFilter {
  mine: boolean
}

export interface CatalogState {
  search: string
  filter: CatalogFilter
  sort: CatalogSort
}

export type CatalogPage = InternalApi['/api/shelves/:shelfId/catalog']['get']

export type CatalogCoffee = CatalogPage['coffees'][number]
