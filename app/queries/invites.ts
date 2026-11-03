import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'

export function useInvites() {
  const request = useRequestFetch()

  return useQuery({
    queryKey: queryKeys.invites(),
    queryFn: () => request('/api/invites'),
  })
}

function useInvitesChanged() {
  const queryClient = useQueryClient()

  return () => queryClient.invalidateQueries({ queryKey: queryKeys.invites() })
}

export function useInviteCreate() {
  const changed = useInvitesChanged()

  return useMutation({
    mutationFn: (body: { email: string } | { link: true }) =>
      $fetch('/api/invites', { method: 'POST', body }),
    onSuccess: changed,
  })
}

export function useInviteRevoke() {
  const changed = useInvitesChanged()

  return useMutation({
    mutationFn: (id: string) =>
      $fetch(`/api/invites/${id}`, { method: 'DELETE' }),
    onSuccess: changed,
  })
}

export function useShelfInvites(shelfId: MaybeRefOrGetter<string>) {
  const request = useRequestFetch()

  return useQuery({
    queryKey: computed(() => queryKeys.shelfInvites(toValue(shelfId))),
    queryFn: () => request(`/api/shelves/${toValue(shelfId)}/invites`),
  })
}

export function useShelfInviteCreate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { shelfId: string; email: string }) =>
      $fetch(`/api/shelves/${input.shelfId}/invites`, {
        method: 'POST',
        body: { email: input.email },
      }),
    onSuccess: (_data, input) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.shelfInvites(input.shelfId),
      }),
  })
}

export function useShelfInviteCancel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { shelfId: string; inviteId: string }) =>
      $fetch(`/api/shelves/${input.shelfId}/invites/${input.inviteId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, input) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.shelfInvites(input.shelfId),
      }),
  })
}

function useNotificationsChanged() {
  const queryClient = useQueryClient()

  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications() })
}

export function useMyInviteAccept() {
  const changed = useNotificationsChanged()

  return useMutation({
    mutationFn: (inviteId: string) =>
      $fetch(`/api/me/invites/${inviteId}/accept`, { method: 'POST' }),
    onSuccess: changed,
  })
}

export function useMyInviteDecline() {
  const changed = useNotificationsChanged()

  return useMutation({
    mutationFn: (inviteId: string) =>
      $fetch(`/api/me/invites/${inviteId}/decline`, { method: 'POST' }),
    onSuccess: changed,
  })
}
