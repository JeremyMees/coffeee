import type { browsingPickers } from '~/utils/browsing'

export interface BrowsingFilter {
  flavorNote: LibraryOption[]
  origin: LibraryOption[]
  roaster: LibraryOption[]
  process: LibraryOption[]
  varietal: LibraryOption[]
  roastLevel: LibraryOption[]
  roastedFor: LibraryOption[]
}

export type BrowsingQuery = Record<string, string | string[]>

export type BrowsingPicker = (typeof browsingPickers)[number]

export interface BrowsingAddress<State> {
  fromRoute: (query: Record<string, unknown>, labels: FilterLabels) => State
  toRoute: (state: State) => BrowsingQuery
  labelsOf: (state: State) => FilterLabels
}
