import { coffeeLink, sharedList } from './lists'

export const processList = sharedList('process')

export const coffeeProcess = coffeeLink('coffeeProcess', 'process', processList)
