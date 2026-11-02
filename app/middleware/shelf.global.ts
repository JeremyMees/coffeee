export default defineNuxtRouteMiddleware(to => {
  const shelfId = shelfIdOf(to)
  const user = useCurrentUser().value

  if (!shelfId || !user) return

  if (!user.shelves.some(shelf => shelf.id === shelfId)) {
    return abortNavigation(
      createError({
        statusCode: 404,
        statusMessage: 'Shelf not found',
        fatal: true,
      }),
    )
  }

  useLastShelfId().value = shelfId
})
