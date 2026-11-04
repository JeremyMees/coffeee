export default defineNuxtRouteMiddleware(to => {
  const param = 'shelfId' in to.params ? to.params.shelfId : undefined
  const user = useCurrentUser().value

  if (!param || !user) return

  const shelfId = idFrom(param)

  const shelf = user.shelves.find(found => found.id === shelfId)

  if (!shelf) {
    return abortNavigation(
      createError({
        statusCode: 404,
        statusMessage: 'Shelf not found',
        fatal: true,
      }),
    )
  }

  useLastShelfId().value = shelfId

  const segment = `/shelves/${param}`

  if (segment !== shelfPath(shelf)) {
    return navigateTo(to.fullPath.replace(segment, shelfPath(shelf)), {
      replace: true,
      redirectCode: 301,
    })
  }
})
