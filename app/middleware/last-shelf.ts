export default defineNuxtRouteMiddleware(({ query }) => {
  const path = lastShelfPath()

  if (query.add === 'coffee' && path !== '/shelves/new') {
    useAddCoffeeLink().value =
      typeof query.link === 'string' ? query.link : null
    useAddCoffee().value = true
  }

  return navigateTo(path, { replace: true })
})
