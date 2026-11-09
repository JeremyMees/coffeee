import { keepPreviousData, useInfiniteQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'

export function useCatalogPages(
  shelfId: MaybeRefOrGetter<string>,
  query: MaybeRefOrGetter<BrowsingQuery>,
  options: { clientOnly?: boolean } = {},
) {
  const request = useRequestFetch()

  return useInfiniteQuery({
    queryKey: computed(() =>
      queryKeys.catalog(toValue(shelfId), toValue(query)),
    ),
    queryFn: ({ pageParam }) =>
      request<CatalogPage>(`/api/shelves/${toValue(shelfId)}/catalog`, {
        query: { ...toValue(query), page: pageParam },
      }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      pages.flatMap(loaded => loaded.coffees).length < last.total
        ? pages.length
        : undefined,
    placeholderData: keepPreviousData,
    enabled: !options.clientOnly || import.meta.client,
  })
}
