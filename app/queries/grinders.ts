import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'

export function useShelfGrinders(shelfId: MaybeRefOrGetter<string>) {
  const request = useRequestFetch()

  return useQuery({
    queryKey: computed(() => queryKeys.shelfGrinders(toValue(shelfId))),
    queryFn: () => request(`/api/shelves/${toValue(shelfId)}/grinders`),
  })
}

export function useGrinderOwn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { shelfId: string; grinder: NewGrinder }) =>
      $fetch(`/api/shelves/${input.shelfId}/grinders`, {
        method: 'POST',
        body: input.grinder,
      }),
    onSuccess: (_data, input) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.shelf(input.shelfId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.lists() }),
      ]),
  })
}

export function useGrinderDisown() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { shelfId: string; grinderId: string }) =>
      $fetch(`/api/shelves/${input.shelfId}/grinders/${input.grinderId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, input) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.shelf(input.shelfId),
      }),
  })
}
