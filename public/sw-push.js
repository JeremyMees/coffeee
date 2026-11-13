self.addEventListener('push', event => {
  const message = event.data?.json()
  if (!message) return

  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      icon: '/pwa-192x192.png',
      badge: '/badge-96x96.png',
      data: { path: message.path },
    }),
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
