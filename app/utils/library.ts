export const librarySortLabels: Record<LibrarySortBy, string> = {
  newest: 'Newest',
  lastBought: 'Last bought',
  rating: 'Your rating',
  communityRating: 'Community rating',
  roaster: 'Roaster',
  origin: 'Origin',
  roastLevel: 'Roast level',
  roastedFor: 'Roasted for',
  latestPrice: 'Latest price',
}

export const librarySortDirections: Record<LibrarySortBy, SortDirection> = {
  newest: 'descending',
  lastBought: 'descending',
  rating: 'descending',
  communityRating: 'descending',
  roaster: 'ascending',
  origin: 'ascending',
  roastLevel: 'ascending',
  roastedFor: 'ascending',
  latestPrice: 'ascending',
}

export const libraryScopeLabels: Record<LibraryScope, string> = {
  all: 'All coffees',
  bought: 'Bought',
}

export const libraryViews = ['grid', 'table'] as const

export function isBoughtSort(column: LibrarySortBy) {
  return (boughtSorts as readonly string[]).includes(column)
}

export function sortsFor(scope: LibraryScope) {
  return librarySorts.filter(
    column => scope === 'bought' || !isBoughtSort(column),
  )
}

export function defaultSortFor(scope: LibraryScope): LibrarySortBy {
  return scope === 'bought' ? 'lastBought' : 'newest'
}

export function sortIn(
  scope: LibraryScope,
  sort: LibrarySort | null,
): LibrarySort | null {
  return sort && sortsFor(scope).includes(sort.column) ? sort : null
}

export function emptyLibraryFilter(): LibraryFilter {
  return { favourites: false, ...emptyBrowsingFilter() }
}

export function isLibraryFiltered(filter: LibraryFilter) {
  return filter.favourites || isBrowsingFiltered(filter)
}

export function libraryQuery(
  search: string,
  filter: LibraryFilter,
  scope: LibraryScope,
  sort: LibrarySort | null = null,
) {
  return {
    ...browsingQuery(search, filter),
    ...(scope === 'bought' && { bought: 'true' }),
    ...(filter.favourites && { favourites: 'true' }),
    ...(sort && { sort: sort.column, direction: sort.direction }),
  } as BrowsingQuery
}

function sortFromRoute(query: Record<string, unknown>): LibrarySort | null {
  const column = librarySorts.find(column => column === query.sort)

  if (!column) return null

  return {
    column,
    direction:
      sortDirections.find(direction => direction === query.direction) ??
      librarySortDirections[column],
  }
}

export const libraryAddress: BrowsingAddress<LibraryState> = {
  fromRoute(query, labels) {
    const { search, filter } = browsingFromRoute(query, labels)
    const sort = sortFromRoute(query)
    const page = Number.parseInt(queryText(query.page), 10)

    return {
      search,
      filter: { favourites: query.favourites === 'true', ...filter },
      scope:
        query.scope === 'bought' || (sort && isBoughtSort(sort.column))
          ? 'bought'
          : 'all',
      view: libraryViews.find(view => view === query.view) ?? 'grid',
      sort,
      pageIndex: page > 1 ? page - 1 : 0,
    }
  },
  toRoute: ({ search, filter, scope, view, sort, pageIndex }) =>
    ({
      ...(scope === 'bought' && { scope }),
      ...browsingRoute(search, filter),
      ...(filter.favourites && { favourites: 'true' }),
      ...(sort && { sort: sort.column, direction: sort.direction }),
      ...(view === 'table' && {
        view,
        ...(pageIndex > 0 && { page: String(pageIndex + 1) }),
      }),
    }) as BrowsingQuery,
  labelsOf: state => browsingLabels(state.filter),
}

export function originNames(coffee: Pick<LibraryCoffee, 'origins'>) {
  return coffee.origins.map(origin => origin.name).join(', ')
}
