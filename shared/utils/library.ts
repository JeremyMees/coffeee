export const librarySorts = [
  'newest',
  'lastBought',
  'rating',
  'communityRating',
  'roaster',
  'origin',
  'roastLevel',
  'roastedFor',
  'latestPrice',
] as const

export const boughtSorts = ['lastBought', 'latestPrice'] as const

export const libraryScopes = ['all', 'bought'] as const

export const sortDirections = ['ascending', 'descending'] as const

export const libraryPageSize = 24

export const libraryFilterPageSize = 20
