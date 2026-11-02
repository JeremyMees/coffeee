import { coffeeLink, sharedList } from './lists'

export const flavorNote = sharedList('flavorNote')

export const coffeeFlavorNote = coffeeLink(
  'coffeeFlavorNote',
  'flavorNote',
  flavorNote,
)
