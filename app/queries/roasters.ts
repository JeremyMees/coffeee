import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'

export function useRoasterPages(
  shelfId: MaybeRefOrGetter<string>,
  query: MaybeRefOrGetter<Record<string, string>>,
) {
  const request = useRequestFetch()

  return useInfiniteQuery({
    queryKey: computed(() =>
      queryKeys.shelfRoasters(toValue(shelfId), toValue(query)),
    ),
    queryFn: ({ pageParam }) =>
      request<RoasterPage>(`/api/shelves/${toValue(shelfId)}/roasters`, {
        query: { ...toValue(query), page: pageParam },
      }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      pages.flatMap(loaded => loaded.roasters).length < last.total
        ? pages.length
        : undefined,
    placeholderData: keepPreviousData,
  })
}

export function useRoaster(roasterId: MaybeRefOrGetter<string>) {
  const request = useRequestFetch()

  return useQuery({
    queryKey: computed(() => queryKeys.roaster(toValue(roasterId))),
    queryFn: () => request(`/api/roasters/${toValue(roasterId)}`),
  })
}

function useRoasterSaved() {
  const queryClient = useQueryClient()

  return (shelfId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.shelf(shelfId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.coffees() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.roasters() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() }),
    ])
}

export function useRoasterUpdate() {
  const saved = useRoasterSaved()

  return useMutation({
    mutationFn: (input: {
      shelfId: string
      roasterId: string
      details: RoasterDetails
    }) =>
      $fetch(`/api/roasters/${input.roasterId}`, {
        method: 'PATCH',
        body: input.details,
      }),
    onSuccess: (_data, input) => saved(input.shelfId),
  })
}

function logoPath(roasterId: string) {
  return `/api/roasters/${roasterId}/logo`
}

export function useRoasterLogoUpdate() {
  const saved = useRoasterSaved()

  return useMutation({
    mutationFn: async (input: {
      shelfId: string
      roasterId: string
      logo: Blob
    }) => {
      const body = new FormData()
      body.append('photo', await compressPhoto(input.logo))

      return $fetch(logoPath(input.roasterId), { method: 'PUT', body })
    },
    onSuccess: (_data, input) => saved(input.shelfId),
  })
}

export function useRoasterLogoRemoval() {
  const saved = useRoasterSaved()

  return useMutation({
    mutationFn: (input: { shelfId: string; roasterId: string }) =>
      $fetch(logoPath(input.roasterId), { method: 'DELETE' }),
    onSuccess: (_data, input) => saved(input.shelfId),
  })
}
