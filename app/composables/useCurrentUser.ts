import type { InternalApi } from 'nitropack/types'

export type CurrentUser = InternalApi['/api/me']['get']

export function useCurrentUser() {
  return useState<CurrentUser | null>('current-user', () => null)
}

export async function signOut() {
  await authClient.signOut()

  useCurrentUser().value = null

  await navigateTo('/sign-in')
}
