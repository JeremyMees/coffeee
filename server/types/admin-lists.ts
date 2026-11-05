import type { SQL } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'
import type { DropPhoto } from '#server/types/catalog-entries'
import type { Database } from '#server/types/database'
import type { SharedList } from '#server/types/lists'
import type { Move } from '#server/types/merges'

export type Removal = { outcome: 'deleted' } | { outcome: 'inUse' }

export interface AdminListTable {
  table: SharedList
  scope?: PgColumn
  mergesWithinScope?: boolean
  detail: SQL<string | null>
  uses: SQL<number>
  merge: (db: Database, move: Move, dropPhoto: DropPhoto) => Promise<void>
  remove: (
    db: Database,
    entryId: string,
    dropPhoto: DropPhoto,
  ) => Promise<Removal>
}
