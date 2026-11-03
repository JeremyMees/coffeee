import type { AdminList, AdminListNouns } from '../types/admin'

export const adminLists = [
  'coffees',
  'roasters',
  'flavorNotes',
  'regions',
  'producers',
  'farms',
  'washingStations',
  'processes',
  'varietals',
  'grinders',
  'grinderBrands',
  'brewMethods',
] as const

export const adminListsPageSize = 25

export const adminListNouns: Record<AdminList, AdminListNouns> = {
  coffees: { one: 'coffee', many: 'Coffees', uses: 'bags' },
  roasters: { one: 'roaster', many: 'Roasters', uses: 'coffees' },
  flavorNotes: { one: 'flavor note', many: 'Flavor notes', uses: 'coffees' },
  regions: { one: 'region', many: 'Regions', uses: 'coffees' },
  producers: { one: 'producer', many: 'Producers', uses: 'coffees' },
  farms: { one: 'farm', many: 'Farms', uses: 'coffees' },
  washingStations: {
    one: 'washing station',
    many: 'Washing stations',
    uses: 'coffees',
  },
  processes: { one: 'process', many: 'Processes', uses: 'coffees' },
  varietals: { one: 'varietal', many: 'Varietals', uses: 'coffees' },
  grinders: { one: 'grinder', many: 'Grinders', uses: 'shelves' },
  grinderBrands: {
    one: 'grinder brand',
    many: 'Grinder brands',
    uses: 'grinders',
  },
  brewMethods: {
    one: 'brew method',
    many: 'Brew methods',
    uses: 'grind settings',
  },
}

export function isAdminList(list: string): list is AdminList {
  return (adminLists as readonly string[]).includes(list)
}

export function adminListForm(list: AdminList) {
  if (list === 'grinders') return 'grinder'

  if (list === 'regions' || list === 'farms' || list === 'washingStations') {
    return 'origin'
  }

  return 'name'
}
