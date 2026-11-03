export function useCurrentUser() {
  return useState<CurrentUser | null>('current-user', () => null)
}

export async function signOut() {
  await authClient.signOut()
  await forgetCurrentUser()
}

export async function forgetCurrentUser() {
  if ('caches' in window) await caches.delete('pages')

  useCurrentUser().value = null

  await navigateTo('/sign-in')
}
