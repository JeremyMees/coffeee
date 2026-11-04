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
  'origins',
  'flavorNotes',
  'regions',
  'producers',
  'farms',
  'processes',
] as const

export const catalogSorts = ['newest', 'communityRating'] as const

export const catalogPageSize = 24
