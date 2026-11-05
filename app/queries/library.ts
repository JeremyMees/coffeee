import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'

function libraryPath(shelfId: MaybeRefOrGetter<string>) {
  return `/api/shelves/${toValue(shelfId)}/library`
}

export function useLibraryPages(
  shelfId: MaybeRefOrGetter<string>,
  query: MaybeRefOrGetter<BrowsingQuery>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const request = useRequestFetch()

  return useInfiniteQuery({
    queryKey: computed(() =>
      queryKeys.library(toValue(shelfId), toValue(query)),
    ),
    queryFn: ({ pageParam }) =>
      request<LibraryPage>(libraryPath(shelfId), {
        query: { ...toValue(query), page: pageParam },
      }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      pages.flatMap(loaded => loaded.coffees).length < last.total
        ? pages.length
        : undefined,
    enabled: () => toValue(enabled),
    placeholderData: keepPreviousData,
  })
}

export function useLibraryPage(
  shelfId: MaybeRefOrGetter<string>,
  query: MaybeRefOrGetter<BrowsingQuery>,
  page: MaybeRefOrGetter<number>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const request = useRequestFetch()

  return useQuery({
    queryKey: computed(() =>
      queryKeys.libraryPage(toValue(shelfId), toValue(query), toValue(page)),
    ),
    queryFn: () =>
      request<LibraryPage>(libraryPath(shelfId), {
        query: { ...toValue(query), page: toValue(page) },
      }),
    enabled: () => toValue(enabled),
    placeholderData: keepPreviousData,
  })
}
