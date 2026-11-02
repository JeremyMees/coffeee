import type { RouteLocationNormalizedLoaded } from 'vue-router'

export function shelfIdOf(
  route: Pick<RouteLocationNormalizedLoaded, 'params'>,
) {
  return 'shelfId' in route.params ? route.params.shelfId : undefined
}

export function useLastShelfId() {
  return useCookie<string | null>('shelf', {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
}

export function useCurrentShelf() {
  const route = useRoute()
  const user = useCurrentUser()
  const lastShelfId = useLastShelfId()

  return computed(() => {
    const shelves = user.value?.shelves ?? []
    const id = shelfIdOf(route) ?? lastShelfId.value

    return shelves.find(shelf => shelf.id === id) ?? shelves[0]
  })
}

export function lastShelfPath() {
  const shelves = useCurrentUser().value?.shelves ?? []
  const lastShelfId = useLastShelfId().value
  const shelf = shelves.find(shelf => shelf.id === lastShelfId) ?? shelves[0]

  return shelf ? `/shelves/${shelf.id}` : '/shelves/new'
}
