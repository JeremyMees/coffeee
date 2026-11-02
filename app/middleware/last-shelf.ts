export default defineNuxtRouteMiddleware(() =>
  navigateTo(lastShelfPath(), { replace: true }),
)
