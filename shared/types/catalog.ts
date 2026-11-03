import type { InferSelectModel } from 'drizzle-orm'
import type { z } from 'zod'
import type { coffee, origin, producer, region } from '#server/db/schemas'
import type { catalogFilters, catalogMatchFields } from '../utils/catalog'
import type { catalogSearchSchema } from '../utils/schemas'

export type Coffee = InferSelectModel<typeof coffee>

export type Origin = InferSelectModel<typeof origin>

export type ListEntry = Pick<InferSelectModel<typeof producer>, 'id' | 'name'>

export type OriginListEntry = ListEntry & {
  origin: InferSelectModel<typeof region>['originCode']
}

export type OriginEntry = Omit<OriginListEntry, 'id'>

export type CatalogFilterKind = (typeof catalogFilters)[number]

export type CatalogMatchField = (typeof catalogMatchFields)[number]

export type CatalogSearch = z.output<typeof catalogSearchSchema>

export interface CatalogMatch {
  field: CatalogMatchField
  name: string
}
