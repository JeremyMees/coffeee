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

export function libraryRoute(
  filter: LibraryFilter,
  view: LibraryView,
  sort: LibrarySort | null,
  pageIndex: number,
) {
  return {
    ...libraryQuery(filter),
    ...(view === 'table' && {
      view,
      ...(sort && { sort: sort.column, direction: sort.direction }),
      ...(pageIndex > 0 && { page: String(pageIndex + 1) }),
    }),
  } as Record<string, string>
}

export function libraryFromRoute(
  query: Record<string, unknown>,
  labels: FilterLabels,
) {
  const column = libraryColumns.find(column => column === query.sort)
  const page = Number.parseInt(queryText(query.page), 10)

  return {
    filter: {
      favourites: query.favourites === 'true',
      roaster: pickedOption(query.roasterId, labels.roasterId),
      flavorNote: pickedOption(query.flavorNoteId, labels.flavorNoteId),
      origin: pickedOption(query.originCode, labels.originCode),
    } satisfies LibraryFilter,
    view: libraryViews.find(view => view === query.view) ?? 'grid',
    sort: column
      ? {
          column,
          direction:
            query.direction === 'descending' ? 'descending' : 'ascending',
        }
      : null,
    pageIndex: page > 1 ? page - 1 : 0,
  } satisfies {
    filter: LibraryFilter
    view: LibraryView
    sort: LibrarySort | null
    pageIndex: number
  }
}

export function libraryLabels(filter: LibraryFilter) {
  return labelsOf([
    ['roasterId', filter.roaster],
    ['flavorNoteId', filter.flavorNote],
    ['originCode', filter.origin],
  ])
}

export function originNames(coffee: Pick<LibraryCoffee, 'origins'>) {
  return coffee.origins.map(origin => origin.name).join(', ')
}
