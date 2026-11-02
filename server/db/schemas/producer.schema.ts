import { coffeeLink, sharedList } from './lists'

export const producer = sharedList('producer')

export const coffeeProducer = coffeeLink('coffeeProducer', 'producer', producer)
