import type { PgColumn, PgTable } from 'drizzle-orm/pg-core'
import type { farm, region, washingStation } from '#server/db/schemas'

export type SharedList = PgTable & {
  id: PgColumn
  name: PgColumn
  nameKey: PgColumn
  originCode?: PgColumn
}

export type OriginList = typeof region | typeof farm | typeof washingStation

export interface CoffeeList<List extends SharedList = SharedList> {
  list: List
  link: PgTable & { coffeeId: PgColumn; position: PgColumn }
  entryId: PgColumn
}

export interface NewListEntry {
  name: string
  originCode?: string
}
