export const notificationKinds = [
  'invited',
  'coffeeAdded',
  'purchaseAdded',
  'bagFinished',
  'memberJoined',
  'memberLeft',
] as const

export const optionalEmailKinds = [
  'coffeeAdded',
  'purchaseAdded',
  'bagFinished',
  'memberJoined',
  'memberLeft',
] as const

export function notificationText(notification: {
  kind: (typeof notificationKinds)[number]
  actor: string | null
  shelf: string
  coffee: string | null
}) {
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
