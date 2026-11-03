import {
  CoffeeIcon,
  CompassIcon,
  LibraryIcon,
  StoreIcon,
  UserIcon,
} from '@lucide/vue'

export function useDestinations() {
  const shelf = useCurrentShelf()

  return computed(() => {
    const base = `/shelves/${shelf.value?.id}`

    return [
      { label: 'Stock', to: base, icon: CoffeeIcon },
      { label: 'Library', to: `${base}/library`, icon: LibraryIcon },
      { label: 'Discover', to: `${base}/discover`, icon: CompassIcon },
      { label: 'Roasters', to: '/roasters', icon: StoreIcon },
      { label: 'Profile', to: '/profile', icon: UserIcon },
    ]
  })
}
