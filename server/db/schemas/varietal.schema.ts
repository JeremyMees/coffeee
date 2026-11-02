import { coffeeLink, sharedList } from './lists'

export const varietal = sharedList('varietal')

export const coffeeVarietal = coffeeLink('coffeeVarietal', 'varietal', varietal)
