import type { SQL } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'
import type { Database } from '#server/types/database'
import type { SharedList } from '#server/types/lists'
import type { Move } from '#server/types/merges'

export type Removal =
  { outcome: 'deleted'; photoUrl: string | null } | { outcome: 'inUse' }

export interface AdminListTable {
  table: SharedList
  scope?: PgColumn
  mergesWithinScope?: boolean
  detail: SQL<string | null>
  uses: SQL<number>
  merge: (db: Database, move: Move) => Promise<(string | null)[]>
  remove: (db: Database, entryId: string) => Promise<Removal>
}
