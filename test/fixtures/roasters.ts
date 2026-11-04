import type { ListedRoaster, ShelfRoaster } from '~/types/roasters'

export function squareMile(): ShelfRoaster {
  return {
    id: 'r2',
    name: 'Square Mile',
    website: 'https://www.squaremilecoffee.com',
    countryCode: 'GB',
    city: 'London',
    logoUrl: null,
    canEdit: true,
  }
}

export function listedRoaster(
  overrides: Partial<ListedRoaster> = {},
): ListedRoaster {
  return {
    id: 'r2',
    name: 'Square Mile',
    website: 'https://www.squaremilecoffee.com',
    countryCode: 'GB',
    city: 'London',
    logoUrl: null,
    shelfCoffees: 2,
    lastBought: '2026-11-01',
    ...overrides,
  }
}
