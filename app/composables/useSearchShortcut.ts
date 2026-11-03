import { onKeyStroke } from '@vueuse/core'

export function useSearchFocus() {
  return useState('search-focus', () => false)
}

export function useSearchShortcut() {
  const shelf = useCurrentShelf()
  const focus = useSearchFocus()

  onKeyStroke('k', event => {
    if (!(event.metaKey || event.ctrlKey) || !shelf.value) return

    event.preventDefault()
    focus.value = true
    navigateTo(`/shelves/${shelf.value.id}/discover`)
  })
}
