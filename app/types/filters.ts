import type { InternalApi } from 'nitropack/types'
import type { filterAreas } from '~/utils/filters'

export type FilterArea = (typeof filterAreas)[number]

export type FilterKind = LibraryFilterKind | CatalogFilterKind

export type FilterOptionsPage =
  | InternalApi['/api/shelves/:shelfId/library/:filter']['get']
  | InternalApi['/api/shelves/:shelfId/catalog/:filter']['get']
