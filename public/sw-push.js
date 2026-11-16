async function showUnread(unread) {
  if (typeof unread !== 'number' || !('setAppBadge' in self.navigator)) return

  await self.navigator.setAppBadge(unread).catch(() => null)
}

self.addEventListener('push', event => {
  const message = event.data?.json()
  if (!message) return

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(message.title, {
        body: message.body,
        icon: '/pwa-192x192.png',
        badge: '/badge-96x96.png',
        data: { path: message.path },
      }),
      showUnread(message.unread),
    ]),
  )
})

async function openPath(path) {
  const url = new URL(path, self.location.origin).href
  const windows = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })
  const open = windows.find(
    client => new URL(client.url).origin === self.location.origin,
  )

  if (open) {
    const focused = await open.focus()
    const navigated = await focused.navigate(url).catch(() => null)
    if (navigated) return
  }

  await self.clients.openWindow(url)
}

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(openPath(event.notification.data?.path ?? '/'))
})
