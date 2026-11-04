export function notificationLink(notification: ShelfNotification) {
  const shelf = { id: notification.shelfId, name: notification.shelf }

  if (notification.kind === 'invited') {
    return notification.inviteStatus === 'accepted' ? shelfPath(shelf) : null
  }

  if (notification.coffeeId) {
    return shelfCoffeePath(shelf, {
      id: notification.coffeeId,
      name: notification.coffee ?? '',
    })
  }

  return `${shelfPath(shelf)}/settings?tab=members`
}
