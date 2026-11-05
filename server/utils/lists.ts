import { and, asc, desc, eq, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core'
import { defineEventHandler } from 'h3'
import { listSearchSchema } from '#shared/utils/schemas'
import { nameKey } from '#shared/utils/names'
import type { Database } from '#server/types/database'
import type { NewListEntry, SharedList } from '#server/types/lists'
import { useDb } from '#server/utils/db'
import { requireUser } from '#server/utils/session'
import { readValidQuery } from '#server/utils/validation'

const similarityThreshold = 0.3
const suggestionLimit = 8

export function findSimilar<Columns extends Record<string, PgColumn>>(
  db: Database,
  list: SharedList,
  search: string,
  options: { where?: SQL; columns?: Columns } = {},
) {
  const key = nameKey(search)
  const entries = db
    .select({
      id: sql<string>`${list.id}`,
      name: sql<string>`${list.name}`,
      ...(options.columns as Columns),
    })
    .from(list)
    .$dynamic()

  if (!key) {
    return entries
      .where(options.where)
      .orderBy(asc(list.nameKey))
      .limit(suggestionLimit)
  }

  const score = sql`word_similarity(${key}, ${list.nameKey})`

  return entries
    .where(
      and(
        options.where,
        or(
          sql`strpos(${list.nameKey}, ${key}) > 0`,
          sql`${score} >= ${similarityThreshold}`,
        ),
      ),
    )
    .orderBy(
      desc(score),
      desc(sql`similarity(${key}, ${list.nameKey})`),
      asc(list.nameKey),
    )
    .limit(suggestionLimit)
}

export function listSearchHandler(list: SharedList) {
  return defineEventHandler(async event => {
    await requireUser(event)
    const { search } = readValidQuery(event, listSearchSchema)

    return findSimilar(useDb(), list, search)
  })
}

export async function findOrCreateEntry(
  db: Database,
  list: SharedList,
  entry: NewListEntry & { createdBy: string },
) {
  const key = nameKey(entry.name)
  const scope = list.originCode && entry.originCode ? list.originCode : null

  await db
    .insert(list)
    .values({ ...entry, nameKey: key } as never)
    .onConflictDoNothing({
      target: scope ? [scope, list.nameKey] : list.nameKey,
    })

  const [found] = await db
    .select({ id: sql<string>`${list.id}` })
    .from(list)
    .where(
      and(
        eq(list.nameKey, key),
        scope ? eq(scope, entry.originCode!) : undefined,
      ),
    )

  return found!.id
}

export async function moveReferences(
  db: Database,
  table: PgTable,
  column: PgColumn,
  move: { from: string; to: string },
) {
  const rows = await db
    .select()
    .from(table as never)
    .where(eq(column, move.from))

  if (rows.length) {
    await db
      .insert(table)
      .values(
        rows.map(row => ({
          ...(row as object),
          [column.name]: move.to,
        })) as never,
      )
      .onConflictDoNothing()
  }

  await db.delete(table).where(eq(column, move.from))
}
