type Named = { id: string; name: string }

export const catalogSortLabels: Record<CatalogSort, string> = {
  newest: 'Newest',
  communityRating: 'Community rating',
}

export function catalogQuery(
  search: string,
  filter: BrowsingFilter,
  sort: CatalogSort = 'newest',
) {
  return {
    ...browsingQuery(search, filter),
    ...(sort !== 'newest' && { sort }),
  } as BrowsingQuery
}

export const catalogAddress: BrowsingAddress<CatalogState> = {
  fromRoute(query, labels) {
    const { search, filter } = browsingFromRoute(query, labels)

    return {
      search,
      filter,
      sort: catalogSorts.find(sort => sort === query.sort) ?? 'newest',
    }
  },
  toRoute: ({ search, filter, sort }) =>
    ({
      ...browsingRoute(search, filter),
      ...(sort !== 'newest' && { sort }),
    }) as BrowsingQuery,
  labelsOf: state => browsingLabels(state.filter),
}

export function catalogCoffeePath(
  shelf: Named,
  coffee: Named & { onShelf: boolean },
) {
  return coffee.onShelf ? shelfCoffeePath(shelf, coffee) : coffeePath(coffee)
}

export function discoverLink(
  shelf: Named,
  search: string,
  filter: BrowsingFilter,
) {
  return {
    path: `${shelfPath(shelf)}/discover`,
    query: browsingRoute(search, filter),
  }
}
