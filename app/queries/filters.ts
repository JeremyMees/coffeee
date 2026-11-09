import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/vue-query'
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

export function useFilterLabels(
  shelfId: MaybeRefOrGetter<string>,
  ids: Record<string, string[]>,
) {
  const request = useRequestFetch()
  const queryClient = useQueryClient()

  const wanted = Object.keys(ids).length > 0
  const labels = useQuery({
    queryKey: computed(() => queryKeys.filterLabels(toValue(shelfId), ids)),
    queryFn: () =>
      request<FilterLabels>(`/api/shelves/${toValue(shelfId)}/filter-labels`, {
        query: ids,
      }),
    enabled: wanted,
    staleTime: Infinity,
  })

  function remember(query: BrowsingQuery, known: FilterLabels) {
    queryClient.setQueryData(
      queryKeys.filterLabels(toValue(shelfId), labelIds(query)),
      known,
    )
  }

  return {
    data: computed(() => (wanted ? labels.data.value : {})),
    isError: labels.isError,
    fetchStatus: labels.fetchStatus,
    refetch: labels.refetch,
    remember,
  }
}
