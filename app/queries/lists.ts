import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'

export interface ListEntry {
  id: string
  name: string
}

export function useListSearch<Entry = ListEntry>(
  endpoint: MaybeRefOrGetter<string>,
  search: MaybeRefOrGetter<string>,
  params: MaybeRefOrGetter<Record<string, string>> = {},
) {
  return useQuery({
    queryKey: computed(() =>
      queryKeys.listSearch(
        toValue(endpoint),
        nameKey(toValue(search)),
        toValue(params),
      ),
    ),
    queryFn: () =>
      $fetch<Entry[]>(toValue(endpoint), {
        query: { ...toValue(params), search: toValue(search) },
      }),
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
  })
}
