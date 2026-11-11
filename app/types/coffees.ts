import type { InternalApi } from 'nitropack/types'

export type ShelfCoffee =
  InternalApi['/api/shelves/:shelfId/coffees/:coffeeId']['get']

export type SharedCoffee = InternalApi['/api/coffees/:coffeeId']['get']

export type CoffeeShelf =
  InternalApi['/api/coffees/:coffeeId/shelves']['get'][number]

export type StockCoffee =
  InternalApi['/api/shelves/:shelfId/stock']['get'][number]

export type EditableCoffee = Omit<
  ShelfCoffee,
  'canEdit' | 'canDelete' | 'photoUrl' | 'roasterId'
>

export type CoffeePreview = Pick<
  StockCoffee,
  'id' | 'name' | 'roaster' | 'photoUrl'
>

export type CardCoffee = Pick<
  StockCoffee,
  | 'id'
  | 'name'
  | 'roaster'
  | 'roastLevel'
  | 'roastedFor'
  | 'roastedOn'
  | 'flavorNotes'
  | 'photoUrl'
  | 'rating'
> & { matches?: CatalogMatch[] }

export type SpecCardCoffee = Pick<
  CardCoffee,
  | 'id'
  | 'name'
  | 'roaster'
  | 'roastLevel'
  | 'roastedFor'
  | 'flavorNotes'
  | 'photoUrl'
  | 'matches'
>

export type PhotoCoffee = Pick<ShelfCoffee, 'id' | 'name' | 'photoUrl'>

type CoffeeReviews = InternalApi['/api/coffees/:coffeeId/reviews']['get']

export type Review = CoffeeReviews['reviews'][number]

export type CoffeeCommunityRating = CoffeeReviews['communityRating']
