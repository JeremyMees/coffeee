import type { InternalApi } from 'nitropack/types'

export type ShelfCoffee =
  InternalApi['/api/shelves/:shelfId/coffees/:coffeeId']['get']

export type SharedCoffee = InternalApi['/api/coffees/:coffeeId']['get']

export type CoffeeShelf = SharedCoffee['shelves'][number]

export type StockCoffee =
  InternalApi['/api/shelves/:shelfId/stock']['get'][number]

export type EditableCoffee = Omit<
  ShelfCoffee,
  | 'canEdit'
  | 'purchases'
  | 'photoUrl'
  | 'rating'
  | 'wouldBuyAgain'
  | 'communityRating'
  | 'reviews'
  | 'grindSettings'
  | 'otherGrindSettings'
  | 'roasterDetails'
>

export type CardCoffee = Pick<
  StockCoffee,
  | 'name'
  | 'roaster'
  | 'roastLevel'
  | 'roastedFor'
  | 'colour'
  | 'roastedOn'
  | 'flavorNotes'
  | 'photoUrl'
  | 'rating'
>

export type PhotoCoffee = Pick<
  ShelfCoffee,
  'id' | 'name' | 'colour' | 'photoUrl' | 'canEdit'
>

export type Review = SharedCoffee['reviews'][number]

export type CoffeeCommunityRating = SharedCoffee['communityRating']
