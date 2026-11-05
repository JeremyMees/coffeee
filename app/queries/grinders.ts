import { useMutation, useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'

export function useShelfGrinders(shelfId: MaybeRefOrGetter<string>) {
  const request = useRequestFetch()

  return useQuery({
    queryKey: computed(() => queryKeys.shelfGrinders(toValue(shelfId))),
    queryFn: () => request(`/api/shelves/${toValue(shelfId)}/grinders`),
  })
}

export function useGrinderOwn() {
  const changed = useChanged()

  return useMutation({
    mutationFn: (input: { shelfId: string; grinder: NewGrinder }) =>
      $fetch(`/api/shelves/${input.shelfId}/grinders`, {
        method: 'POST',
        body: input.grinder,
      }),
    onSuccess: (_data, input) =>
      changed({ type: 'grinder', shelfId: input.shelfId }),
  })
}

export function useGrinderDisown() {
  const changed = useChanged()

  return useMutation({
    mutationFn: (input: { shelfId: string; grinderId: string }) =>
      $fetch(`/api/shelves/${input.shelfId}/grinders/${input.grinderId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, input) =>
      changed({ type: 'grinder', shelfId: input.shelfId }),
  })
}
