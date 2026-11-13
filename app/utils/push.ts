const subscriptionPath = '/api/me/push/subscription'

export function pushSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function base64UrlToBytes(value: string) {
  const base64 = (value + '='.repeat((4 - (value.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  return Uint8Array.from(atob(base64), char => char.charCodeAt(0))
}

export async function devicePushSubscription() {
  if (!pushSupported()) return null

  const registration = await navigator.serviceWorker.getRegistration()

  return (await registration?.pushManager.getSubscription()) ?? null
}

export async function subscribeDevice(publicKey: string) {
  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(publicKey),
    }))

  try {
    await $fetch(subscriptionPath, {
      method: 'PUT',
      body: subscription.toJSON(),
    })
  } catch (caught) {
    await subscription.unsubscribe()

    throw caught
  }
}

export async function unsubscribeDevice() {
  const subscription = await devicePushSubscription()
  if (!subscription) return

  await $fetch(subscriptionPath, {
    method: 'DELETE',
    body: { endpoint: subscription.endpoint },
  })
  await subscription.unsubscribe()
}

export async function forgetDevicePush() {
  const subscription = await devicePushSubscription()

  await subscription?.unsubscribe()
}
