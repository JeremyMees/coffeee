import { CoffeeIcon, LibraryIcon, StoreIcon, UserIcon } from '@lucide/vue'

export function useDestinations() {
  const shelf = useCurrentShelf()

  return computed(() => {
    const base = shelf.value ? shelfPath(shelf.value) : '/shelves/new'

    return [
      { label: 'Stock', to: base, icon: CoffeeIcon },
      { label: 'Library', to: `${base}/library`, icon: LibraryIcon },
      { label: 'Roasters', to: '/roasters', icon: StoreIcon },
      { label: 'Profile', to: '/profile', icon: UserIcon },
    ]
  })
}
