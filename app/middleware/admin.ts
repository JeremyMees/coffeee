export default defineNuxtRouteMiddleware(() => {
  if (useCurrentUser().value?.role !== 'admin') return navigateTo('/')
})
