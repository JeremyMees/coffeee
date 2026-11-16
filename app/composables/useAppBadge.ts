import { useUnreadNotifications } from '~/queries/notifications'

export function useAppBadge() {
  const { data } = useUnreadNotifications()

  onMounted(() => {
    watch(
      () => data.value?.unread,
      unread => {
        if (unread !== undefined) showUnreadOnBadge(unread)
      },
      { immediate: true },
    )
  })
}
