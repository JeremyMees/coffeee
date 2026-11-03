import type { InternalApi } from 'nitropack/types'

export type OwnedGrinder =
  InternalApi['/api/shelves/:shelfId/grinders']['get'][number]

export type ListedBrewMethod = InternalApi['/api/brew-methods']['get'][number]

export type OwnGrindSetting = ShelfCoffee['grindSettings'][number]

export type OtherGrindSetting = ShelfCoffee['otherGrindSettings'][number]
