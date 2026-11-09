import { useMutation, useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'

export function useInvites() {
  const request = useRequestFetch()

  return useQuery({
    queryKey: queryKeys.invites(),
    queryFn: () => request('/api/invites'),
  })
}

function orNullWhen(status: number) {
  return (error: unknown) => {
    if ((error as { statusCode?: number }).statusCode === status) return null

    throw error
  }
}

export function useInviteLink(token: string) {
  const request = useRequestFetch()

  return useQuery({
    queryKey: queryKeys.inviteLink(token),
    queryFn: async () => {
      const [invite, user] = await Promise.all([
        request(`/api/invites/link/${token}`).catch(orNullWhen(404)),
        request('/api/me').catch(orNullWhen(401)),
      ])

      return { invite, user }
    },
    gcTime: 0,
  })
}

function useInvitesChanged() {
  const changed = useChanged()

  return () => changed({ type: 'invites' })
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
  const changed = useChanged()

  return useMutation({
    mutationFn: (input: { shelfId: string; email: string }) =>
      $fetch(`/api/shelves/${input.shelfId}/invites`, {
        method: 'POST',
        body: { email: input.email },
      }),
    onSuccess: (_data, input) =>
      changed({ type: 'shelfInvites', shelfId: input.shelfId }),
  })
}

export function useShelfInviteCancel() {
  const changed = useChanged()

  return useMutation({
    mutationFn: (input: { shelfId: string; inviteId: string }) =>
      $fetch(`/api/shelves/${input.shelfId}/invites/${input.inviteId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, input) =>
      changed({ type: 'shelfInvites', shelfId: input.shelfId }),
  })
}

function useMyInvitesChanged() {
  const changed = useChanged()

  return () => changed({ type: 'myInvites' })
}

export function useMyInviteAccept() {
  const changed = useMyInvitesChanged()

  return useMutation({
    mutationFn: (inviteId: string) =>
      $fetch(`/api/me/invites/${inviteId}/accept`, { method: 'POST' }),
    onSuccess: changed,
  })
}

export function useMyInviteDecline() {
  const changed = useMyInvitesChanged()

  return useMutation({
    mutationFn: (inviteId: string) =>
      $fetch(`/api/me/invites/${inviteId}/decline`, { method: 'POST' }),
    onSuccess: changed,
  })
}
