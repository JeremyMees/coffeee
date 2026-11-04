import type { browsingPickers } from '~/utils/browsing'

export interface BrowsingFilter {
  flavorNote: LibraryOption | null
  origin: LibraryOption | null
  roaster: LibraryOption | null
  process: LibraryOption | null
  varietal: LibraryOption | null
  roastLevel: LibraryOption | null
  roastedFor: LibraryOption | null
}

export type BrowsingPicker = (typeof browsingPickers)[number]

export interface BrowsingAddress<State> {
  fromRoute: (query: Record<string, unknown>, labels: FilterLabels) => State
  toRoute: (state: State) => Record<string, string>
  labelsOf: (state: State) => FilterLabels
}
