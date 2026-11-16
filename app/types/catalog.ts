import type { InternalApi } from 'nitropack/types'

export type CatalogPage = InternalApi['/api/shelves/:shelfId/catalog']['get']

export type CatalogCoffee = CatalogPage['coffees'][number]
