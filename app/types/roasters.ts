import type { InternalApi } from 'nitropack/types'

export type ShelfRoaster = ShelfCoffee['roasterDetails']

export type RoasterPage = InternalApi['/api/shelves/:shelfId/roasters']['get']

export type ListedRoaster = RoasterPage['roasters'][number]
