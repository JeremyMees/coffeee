import { descriptionListFields } from './coffee'

export const catalogFilters = [
  'flavor-notes',
  'origins',
  'roasters',
  'processes',
  'varietals',
  'roast-levels',
  'roasted-for',
] as const

export const catalogMatchFields = [
  'name',
  'roaster',
  'origins',
  ...descriptionListFields,
] as const

export const catalogSorts = ['newest', 'communityRating'] as const

export const catalogPageSize = 24
