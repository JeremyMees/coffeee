export const libraryColumnLabels: Record<LibraryColumn, string> = {
  rating: 'Rating',
  roaster: 'Roaster',
  origin: 'Origin',
  roastLevel: 'Roast level',
  latestPrice: 'Latest price',
  lastBought: 'Last bought',
}

export const libraryViews = ['grid', 'table'] as const

export function emptyLibraryFilter(): LibraryFilter {
  return { favourites: false, ...emptyBrowsingFilter() }
}

export function isLibraryFiltered(filter: LibraryFilter) {
  return filter.favourites || isBrowsingFiltered(filter)
}

export function libraryQuery(
  search: string,
  filter: LibraryFilter,
  sort: LibrarySort | null = null,
) {
  return {
    ...browsingQuery(search, filter),
    ...(filter.favourites && { favourites: 'true' }),
    ...(sort && { sort: sort.column, direction: sort.direction }),
  } as BrowsingQuery
}

export const libraryAddress: BrowsingAddress<LibraryState> = {
  fromRoute(query, labels) {
    const { search, filter } = browsingFromRoute(query, labels)
    const column = libraryColumns.find(column => column === query.sort)
    const page = Number.parseInt(queryText(query.page), 10)

    return {
      search,
      filter: { favourites: query.favourites === 'true', ...filter },
      view: libraryViews.find(view => view === query.view) ?? 'grid',
      sort: column
        ? {
            column,
            direction:
              query.direction === 'descending' ? 'descending' : 'ascending',
          }
        : null,
      pageIndex: page > 1 ? page - 1 : 0,
    }
  },
  toRoute: ({ search, filter, view, sort, pageIndex }) =>
    ({
      ...browsingRoute(search, filter),
      ...(filter.favourites && { favourites: 'true' }),
      ...(view === 'table' && {
        view,
        ...(sort && { sort: sort.column, direction: sort.direction }),
        ...(pageIndex > 0 && { page: String(pageIndex + 1) }),
      }),
    }) as BrowsingQuery,
  labelsOf: state => browsingLabels(state.filter),
}

export function originNames(coffee: Pick<LibraryCoffee, 'origins'>) {
  return coffee.origins.map(origin => origin.name).join(', ')
}
