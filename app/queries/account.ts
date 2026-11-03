import { useMutation, useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'

export function useOwnedShelves(enabled: MaybeRefOrGetter<boolean>) {
  const request = useRequestFetch()

  return useQuery({
    queryKey: queryKeys.ownedShelves(),
    queryFn: () => request('/api/me/owned-shelves'),
    enabled: () => toValue(enabled),
  })
}

export function useAccountDelete() {
  return useMutation({
    mutationFn: (heirs: Record<string, string>) =>
      $fetch('/api/me', { method: 'DELETE', body: { heirs } }),
    onSuccess: forgetCurrentUser,
  })
}
