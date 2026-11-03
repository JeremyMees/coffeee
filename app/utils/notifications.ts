export function notificationLink(notification: ShelfNotification) {
  if (notification.kind === 'invited') {
    return notification.inviteStatus === 'accepted'
      ? `/shelves/${notification.shelfId}`
      : null
  }

  if (notification.coffeeId) {
    return `/shelves/${notification.shelfId}/coffees/${notification.coffeeId}`
  }

  return `/shelves/${notification.shelfId}/settings?tab=members`
}
