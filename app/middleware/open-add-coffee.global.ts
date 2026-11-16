export default defineNuxtRouteMiddleware(to => {
  if (import.meta.server || to.query.add !== 'coffee' || !shelfIdOf(to)) {
    return
  }

  const { add: _add, link, ...query } = to.query

  useAddCoffeeLink().value = typeof link === 'string' ? link : null
  useAddCoffee().value = true

  return navigateTo({ path: to.path, query, hash: to.hash }, { replace: true })
})
