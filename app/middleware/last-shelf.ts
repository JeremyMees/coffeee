export default defineNuxtRouteMiddleware(({ query }) => {
  const path = lastShelfPath()

  if (query.add === 'coffee' && path !== '/shelves/new') {
    useAddCoffee().value = true
  }

  return navigateTo(path, { replace: true })
})
