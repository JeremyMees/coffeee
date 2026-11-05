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

export function useProfileStats() {
  const request = useRequestFetch()

  return useQuery({
    queryKey: queryKeys.profileStats(),
    queryFn: () => request('/api/me/stats'),
  })
}

export function useProfileRename() {
  const user = useCurrentUser()

  return useMutation({
    mutationFn: (name: string) =>
      $fetch('/api/me', { method: 'PATCH', body: { name } }),
    onSuccess: ({ name }) => {
      if (user.value) user.value = { ...user.value, name }
    },
  })
}

export function useAccountDelete() {
  return useMutation({
    mutationFn: (heirs: Record<string, string>) =>
      $fetch('/api/me', { method: 'DELETE', body: { heirs } }),
    onSuccess: forgetCurrentUser,
  })
}
