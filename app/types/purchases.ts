import type { InternalApi } from 'nitropack/types'

export type ShelfPurchase =
  InternalApi['/api/shelves/:shelfId/coffees/:coffeeId/purchases']['get'][number]
