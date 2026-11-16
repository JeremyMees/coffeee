import { onKeyStroke } from '@vueuse/core'

export function useSearchFocus() {
  return useState('search-focus', () => false)
}

export function useSearchShortcut() {
  const shelf = useCurrentShelf()
  const focus = useSearchFocus()
  const route = useRoute()

  onKeyStroke('k', event => {
    if (!(event.metaKey || event.ctrlKey) || !shelf.value) return

    event.preventDefault()
    focus.value = true

    const library = `${shelfPath(shelf.value)}/library`
    if (route.path !== library) navigateTo(library)
  })
}
