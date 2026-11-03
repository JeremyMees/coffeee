import { CoffeeIcon, CompassIcon, LibraryIcon, UserIcon } from '@lucide/vue'

export function useDestinations() {
  const shelf = useCurrentShelf()

  return computed(() => {
    const base = `/shelves/${shelf.value?.id}`

    return [
      { label: 'Stock', to: base, icon: CoffeeIcon },
      { label: 'Library', to: `${base}/library`, icon: LibraryIcon },
      { label: 'Discover', to: `${base}/discover`, icon: CompassIcon },
      { label: 'Profile', to: '/profile', icon: UserIcon },
    ]
  })
}
