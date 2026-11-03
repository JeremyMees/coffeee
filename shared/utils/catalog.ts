export const catalogFilters = [
  'flavor-notes',
  'origins',
  'roasters',
  'processes',
  'roast-levels',
  'roasted-for',
] as const

export const catalogMatchFields = [
  'name',
  'roaster',
  'flavorNote',
  'origin',
  'region',
  'producer',
  'farm',
  'process',
] as const

export const catalogSorts = ['newest', 'communityRating'] as const

export const catalogPageSize = 24
