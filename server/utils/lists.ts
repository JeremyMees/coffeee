import { asc, desc, or, sql } from 'drizzle-orm'
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core'
import { nameKey } from '#shared/utils/names'
import type { Database } from '#server/db/database'

type SharedList = PgTable & {
  id: PgColumn
  name: PgColumn
  nameKey: PgColumn
}

const similarityThreshold = 0.3
const suggestionLimit = 8

export function findSimilar(db: Database, list: SharedList, search: string) {
  const key = nameKey(search)
  const entries = db
    .select({ id: sql<string>`${list.id}`, name: sql<string>`${list.name}` })
    .from(list)
    .$dynamic()

  if (!key) return entries.orderBy(asc(list.nameKey)).limit(suggestionLimit)

  const score = sql`word_similarity(${key}, ${list.nameKey})`

  return entries
    .where(
      or(
        sql`strpos(${list.nameKey}, ${key}) > 0`,
        sql`${score} >= ${similarityThreshold}`,
      ),
    )
    .orderBy(
      desc(score),
      desc(sql`similarity(${key}, ${list.nameKey})`),
      asc(list.nameKey),
    )
    .limit(suggestionLimit)
}
