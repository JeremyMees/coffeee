import { CoffeeIcon, LibraryIcon, SearchIcon, UserIcon } from '@lucide/vue'

export function useDestinations() {
  const shelf = useCurrentShelf()

  return computed(() => {
    const base = `/shelves/${shelf.value?.id}`

    return [
      { label: 'Stock', to: base, icon: CoffeeIcon },
      { label: 'Library', to: `${base}/library`, icon: LibraryIcon },
      { label: 'Search', to: `${base}/search`, icon: SearchIcon },
      { label: 'Profile', to: '/profile', icon: UserIcon },
    ]
  })
}
