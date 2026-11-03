import { onKeyStroke, useMediaQuery } from '@vueuse/core'

export function useAddCoffee() {
  return useState('add-coffee-open', () => false)
}

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  )
}

export function useAddCoffeeShortcut() {
  const shelf = useCurrentShelf()
  const addCoffee = useAddCoffee()
  const desktop = useMediaQuery('(min-width: 1024px)')

  onKeyStroke(['n', 'N'], event => {
    if (
      !desktop.value ||
      !shelf.value ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.repeat ||
      isTyping(event.target) ||
      document.querySelector('[role="dialog"]')
    ) {
      return
    }

    event.preventDefault()
    addCoffee.value = true
  })
}
