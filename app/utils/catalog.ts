export const catalogSortLabels: Record<CatalogSort, string> = {
  newest: 'Newest',
  communityRating: 'Community rating',
}

export function emptyCatalogFilter(): CatalogFilter {
  return { mine: false, ...emptyBrowsingFilter() }
}

export function isCatalogFiltered(filter: CatalogFilter) {
  return filter.mine || isBrowsingFiltered(filter)
}

export function catalogQuery(
  search: string,
  filter: CatalogFilter,
  sort: CatalogSort = 'newest',
) {
  return {
    ...browsingQuery(search, filter),
    ...(filter.mine && { mine: 'true' }),
    ...(sort !== 'newest' && { sort }),
  } as Record<string, string>
}

export const catalogAddress: BrowsingAddress<CatalogState> = {
  fromRoute(query, labels) {
    const { search, filter } = browsingFromRoute(query, labels)

    return {
      search,
      filter: { mine: query.mine === 'true', ...filter },
      sort: catalogSorts.find(sort => sort === query.sort) ?? 'newest',
    }
  },
  toRoute: ({ search, filter, sort }) =>
    ({
      ...browsingRoute(search, filter),
      ...(filter.mine && { mine: 'true' }),
      ...(sort !== 'newest' && { sort }),
    }) as Record<string, string>,
  labelsOf: state => browsingLabels(state.filter),
}
