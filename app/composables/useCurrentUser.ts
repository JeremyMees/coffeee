export function useCurrentUser() {
  return useState<CurrentUser | null>('current-user', () => null)
}

export async function signOut() {
  await unsubscribeDevice().catch(caught =>
    console.error('Could not remove the push subscription', caught),
  )
  await authClient.signOut()
  await forgetCurrentUser()
}

export async function forgetCurrentUser() {
  if ('caches' in window) await caches.delete('pages')

  await forgetDevicePush().catch(caught =>
    console.error('Could not forget the push subscription', caught),
  )

  await clearBadge()

  useCurrentUser().value = null

  await navigateTo('/sign-in')
}
