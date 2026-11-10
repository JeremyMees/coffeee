import type { InternalApi } from 'nitropack/types'

export type ShelfRoaster = InternalApi['/api/coffees/:coffeeId/roaster']['get']

export type RoasterPage = InternalApi['/api/shelves/:shelfId/roasters']['get']

export type ListedRoaster = RoasterPage['roasters'][number]

export interface RoasterFilter {
  country: LibraryOption[]
  boughtFrom: boolean
}

export type RoasterQuery = Record<string, string | string[]>
