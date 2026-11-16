export function badgeSupported() {
  return 'setAppBadge' in navigator && 'clearAppBadge' in navigator
}

export async function showUnreadOnBadge(unread: number) {
  if (!badgeSupported()) return

  await (
    unread > 0 ? navigator.setAppBadge(unread) : navigator.clearAppBadge()
  ).catch(() => null)
}

export function clearBadge() {
  return showUnreadOnBadge(0)
}
