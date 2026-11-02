import type { InternalApi } from 'nitropack/types'

export type ShelfCoffee =
  InternalApi['/api/shelves/:shelfId/coffees/:coffeeId']['get']

export type StockCoffee =
  InternalApi['/api/shelves/:shelfId/stock']['get'][number]

export type EditableCoffee = Omit<ShelfCoffee, 'canEdit' | 'purchases'>

export type CardCoffee = Pick<
  StockCoffee,
  'name' | 'roaster' | 'roastLevel' | 'roastedFor' | 'colour' | 'roastedOn'
>
