import type { z } from 'zod'
import type {
  libraryColumns,
  libraryFilters,
  sortDirections,
} from '../utils/library'
import type {
  libraryFilterSearchSchema,
  librarySearchSchema,
} from '../utils/schemas'

export type LibraryColumn = (typeof libraryColumns)[number]

export type LibraryFilterKind = (typeof libraryFilters)[number]

export type SortDirection = (typeof sortDirections)[number]

export type LibrarySearch = z.output<typeof librarySearchSchema>

export type LibraryFilterSearch = z.output<typeof libraryFilterSearchSchema>

export interface LibraryOption {
  value: string
  label: string
}
