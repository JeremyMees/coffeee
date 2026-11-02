import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'

export interface ListEntry {
  id: string
  name: string
}

export function useListSearch(
  endpoint: MaybeRefOrGetter<string>,
  search: MaybeRefOrGetter<string>,
) {
  return useQuery({
    queryKey: computed(() =>
      queryKeys.listSearch(toValue(endpoint), nameKey(toValue(search))),
    ),
    queryFn: () =>
      $fetch<ListEntry[]>(toValue(endpoint), {
        query: { search: toValue(search) },
      }),
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
  })
}
