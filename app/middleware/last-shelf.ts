export default defineNuxtRouteMiddleware(({ query }) => {
  const path = lastShelfPath()
  const adding = query.add === 'coffee' && path !== '/shelves/new'

  return navigateTo(
    { path, query: adding ? { add: 'coffee', link: query.link } : {} },
    { replace: true },
  )
})
