import type { InferSelectModel } from 'drizzle-orm'
import type { coffee, origin, producer, region } from '#server/db/schemas'

export type Coffee = InferSelectModel<typeof coffee>

export type Origin = InferSelectModel<typeof origin>

export type ListEntry = Pick<InferSelectModel<typeof producer>, 'id' | 'name'>

export type OriginListEntry = ListEntry & {
  origin: InferSelectModel<typeof region>['originCode']
}

export type OriginEntry = Omit<OriginListEntry, 'id'>
