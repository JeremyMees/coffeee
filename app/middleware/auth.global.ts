export default defineNuxtRouteMiddleware(async to => {
  if (isPublicPath(to.path)) return

  const user = useCurrentUser()
  user.value ??= await useRequestFetch()('/api/me').catch(() => null)

  if (!user.value) return navigateTo(signInFor(to.fullPath))
})
