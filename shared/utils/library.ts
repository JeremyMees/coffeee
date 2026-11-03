export const libraryColumns = [
  'rating',
  'roaster',
  'origin',
  'roastLevel',
  'latestPrice',
  'lastBought',
] as const

export const libraryFilters = ['roasters', 'flavor-notes', 'origins'] as const

export const sortDirections = ['ascending', 'descending'] as const

export const libraryPageSize = 24

export const libraryFilterPageSize = 20
