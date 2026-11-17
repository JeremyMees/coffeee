import type { z } from 'zod/mini'
import type {
  libraryScopes,
  librarySorts,
  sortDirections,
} from '../utils/library'
import type {
  libraryFilterSearchSchema,
  librarySearchSchema,
} from '../utils/schemas'

export type LibrarySortBy = (typeof librarySorts)[number]

export type LibraryScope = (typeof libraryScopes)[number]

export type SortDirection = (typeof sortDirections)[number]

export type LibrarySearch = z.output<typeof librarySearchSchema>

export type LibraryFilterSearch = z.output<typeof libraryFilterSearchSchema>

export interface LibraryOption {
  value: string
  label: string
}
