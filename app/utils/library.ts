export const libraryColumnLabels: Record<LibraryColumn, string> = {
  rating: 'Rating',
  roaster: 'Roaster',
  origin: 'Origin',
  roastLevel: 'Roast level',
  latestPrice: 'Latest price',
  lastBought: 'Last bought',
}

export const libraryViews = ['grid', 'table'] as const

export const libraryFilterLabels: Record<LibraryFilterKind, string> = {
  roasters: 'Roaster',
  'flavor-notes': 'Flavor note',
  origins: 'Origin',
}

export function emptyLibraryFilter(): LibraryFilter {
  return { favourites: false, roaster: null, flavorNote: null, origin: null }
}

export function isLibraryFiltered(filter: LibraryFilter) {
  return Boolean(
    filter.favourites || filter.roaster || filter.flavorNote || filter.origin,
  )
}

export function libraryQuery(
  filter: LibraryFilter,
  sort: LibrarySort | null = null,
) {
  return {
    ...(filter.favourites && { favourites: 'true' }),
    ...(filter.roaster && { roasterId: filter.roaster.value }),
    ...(filter.flavorNote && { flavorNoteId: filter.flavorNote.value }),
    ...(filter.origin && { originCode: filter.origin.value }),
    ...(sort && { sort: sort.column, direction: sort.direction }),
  } as Record<string, string>
}

export function originNames(coffee: Pick<LibraryCoffee, 'origins'>) {
  return coffee.origins.map(origin => origin.name).join(', ')
}
