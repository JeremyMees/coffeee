import { keepPreviousData, useInfiniteQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'

export function useFilterOptions(
  shelfId: MaybeRefOrGetter<string>,
  area: MaybeRefOrGetter<FilterArea>,
  kind: MaybeRefOrGetter<FilterKind>,
  search: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useInfiniteQuery({
    queryKey: computed(() =>
      queryKeys.filterOptions(
        toValue(shelfId),
        toValue(area),
        toValue(kind),
        nameKey(toValue(search)),
      ),
    ),
    queryFn: ({ pageParam }) =>
      $fetch<FilterOptionsPage>(
        `/api/shelves/${toValue(shelfId)}/${toValue(area)}/${toValue(kind)}`,
        { query: { search: toValue(search), page: pageParam } },
      ),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      last.hasMore ? pages.length : undefined,
    enabled: () => toValue(enabled),
    placeholderData: keepPreviousData,
  })
}
