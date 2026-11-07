import type { InternalApi } from 'nitropack/types'

export type OwnedGrinder =
  InternalApi['/api/shelves/:shelfId/grinders']['get'][number]

export type ListedBrewMethod = InternalApi['/api/brew-methods']['get'][number]

export type CoffeeGrindSettings =
  InternalApi['/api/shelves/:shelfId/coffees/:coffeeId/grind-settings']['get']

export type OwnGrindSetting = CoffeeGrindSettings['grindSettings'][number]

export type OtherGrindSetting =
  CoffeeGrindSettings['otherGrindSettings'][number]
