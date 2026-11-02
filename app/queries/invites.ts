import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'

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
