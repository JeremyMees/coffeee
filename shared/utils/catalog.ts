import { descriptionListFields } from './coffee'

export const catalogMatchFields = [
  'name',
  'roaster',
  'origins',
  ...descriptionListFields,
] as const

export const catalogSorts = ['newest', 'communityRating'] as const

export const catalogPageSize = 24
