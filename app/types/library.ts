import type { InternalApi } from 'nitropack/types'
import type { libraryViews } from '~/utils/library'

export interface LibraryFilter extends BrowsingFilter {
  favourites: boolean
}

export interface LibrarySort {
  column: LibraryColumn
  direction: SortDirection
}

export type LibraryView = (typeof libraryViews)[number]

export interface LibraryState {
  search: string
  filter: LibraryFilter
  view: LibraryView
  sort: LibrarySort | null
  pageIndex: number
}

export type LibraryPage = InternalApi['/api/shelves/:shelfId/library']['get']

export type LibraryCoffee = LibraryPage['coffees'][number]
