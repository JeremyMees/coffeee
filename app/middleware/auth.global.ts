const publicPaths = [
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/invite/',
]

export default defineNuxtRouteMiddleware(async to => {
  if (publicPaths.some(path => to.path.startsWith(path))) return

  const user = useCurrentUser()
  user.value ??= await useRequestFetch()('/api/me').catch(() => null)

  if (!user.value) {
    return navigateTo({
      path: '/sign-in',
      query: to.fullPath === '/' ? {} : { redirect: to.fullPath },
    })
  }
})
