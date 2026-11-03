export function notificationText(notification: ShelfNotification) {
  const actor = notification.actor ?? 'Someone'
  const coffee = notification.coffee ?? 'a coffee'
  const shelf = notification.shelf

  switch (notification.kind) {
    case 'invited':
      return `${actor} invited you to ${shelf}`
    case 'coffeeAdded':
      return `${actor} added ${coffee} to ${shelf}`
    case 'purchaseAdded':
      return `${actor} added a bag of ${coffee} to ${shelf}`
    case 'bagFinished':
      return `${actor} finished a bag of ${coffee} on ${shelf}`
    case 'memberJoined':
      return `${actor} joined ${shelf}`
    case 'memberLeft':
      return `${actor} left ${shelf}`
  }
}

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
