import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'

export function useShelfMembers(shelfId: MaybeRefOrGetter<string>) {
  const request = useRequestFetch()

  return useQuery({
    queryKey: computed(() => queryKeys.shelfMembers(toValue(shelfId))),
    queryFn: () => request(`/api/shelves/${toValue(shelfId)}/members`),
  })
}

function useShelfReplaced() {
  const user = useCurrentUser()

  return (changed: CurrentUser['shelves'][number]) => {
    if (!user.value) return

    user.value.shelves = user.value.shelves.map(found =>
      found.id === changed.id ? changed : found,
    )
  }
}

function useShelfGone() {
  const user = useCurrentUser()

  return async (shelfId: string) => {
    if (user.value) {
      user.value.shelves = user.value.shelves.filter(
        found => found.id !== shelfId,
      )
    }

    await navigateTo(lastShelfPath())
  }
}

export function useShelfRename() {
  const replaced = useShelfReplaced()

  return useMutation({
    mutationFn: (input: { shelfId: string; name: string }) =>
      $fetch(`/api/shelves/${input.shelfId}`, {
        method: 'PATCH',
        body: { name: input.name },
      }),
    onSuccess: replaced,
  })
}

export function useShelfHandOver() {
  const replaced = useShelfReplaced()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { shelfId: string; ownerId: string }) =>
      $fetch(`/api/shelves/${input.shelfId}/owner`, {
        method: 'PUT',
        body: { ownerId: input.ownerId },
      }),
    onSuccess: async shelf => {
      replaced(shelf)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.shelfMembers(shelf.id),
      })
    },
  })
}

export function useShelfMemberRemove() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { shelfId: string; userId: string }) =>
      $fetch(`/api/shelves/${input.shelfId}/members/${input.userId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, input) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.shelfMembers(input.shelfId),
      }),
  })
}

export function useShelfLeave() {
  const gone = useShelfGone()

  return useMutation({
    mutationFn: (shelfId: string) =>
      $fetch(`/api/shelves/${shelfId}/leave`, { method: 'POST' }),
    onSuccess: (_data, shelfId) => gone(shelfId),
  })
}

export function useShelfDelete() {
  const gone = useShelfGone()

  return useMutation({
    mutationFn: (shelfId: string) =>
      $fetch(`/api/shelves/${shelfId}`, { method: 'DELETE' }),
    onSuccess: (_data, shelfId) => gone(shelfId),
  })
}
