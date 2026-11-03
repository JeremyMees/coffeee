import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'

const unreadRefresh = 60 * 1000

export function useNotifications() {
  const request = useRequestFetch()

  return useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () => request('/api/me/notifications'),
  })
}

export function useUnreadNotifications() {
  const request = useRequestFetch()

  return useQuery({
    queryKey: queryKeys.unreadNotifications(),
    queryFn: () => request('/api/me/notifications/unread'),
    refetchInterval: unreadRefresh,
  })
}

export function useNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => $fetch('/api/me/notifications/read', { method: 'POST' }),
    onSuccess: () =>
      queryClient.setQueryData(queryKeys.unreadNotifications(), { unread: 0 }),
  })
}

export function useNotificationEmails() {
  const request = useRequestFetch()

  return useQuery({
    queryKey: queryKeys.notificationEmails(),
    queryFn: () => request('/api/me/notifications/emails'),
  })
}

export function useNotificationEmailsUpdate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (emailed: OptionalEmailKind[]) =>
      $fetch('/api/me/notifications/emails', {
        method: 'PUT',
        body: { emailed },
      }),
    onSuccess: saved =>
      queryClient.setQueryData(queryKeys.notificationEmails(), saved),
  })
}
