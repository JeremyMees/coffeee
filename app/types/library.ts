import type { InternalApi } from 'nitropack/types'
import type { libraryViews } from '~/utils/library'

export interface LibraryFilter {
  favourites: boolean
  roaster: LibraryOption | null
  flavorNote: LibraryOption | null
  origin: LibraryOption | null
}

export interface LibrarySort {
  column: LibraryColumn
  direction: SortDirection
}

export type LibraryView = (typeof libraryViews)[number]

export type LibraryPage = InternalApi['/api/shelves/:shelfId/library']['get']

export type LibraryCoffee = LibraryPage['coffees'][number]

export type LibraryFilterPage =
  InternalApi['/api/shelves/:shelfId/library/:filter']['get']
