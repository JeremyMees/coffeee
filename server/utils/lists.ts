import { and, asc, desc, eq, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'
import { defineEventHandler } from 'h3'
import { listSearchSchema } from '#shared/utils/schemas'
import { nameKey } from '#shared/utils/names'
import type { Database } from '#server/types/database'
import type { CoffeeList, NewListEntry, SharedList } from '#server/types/lists'
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

export async function describeEntries(
  db: Database,
  { list, link, entryId }: CoffeeList,
  input: { coffeeId: string; userId: string; entries: NewListEntry[] },
) {
  const ids = new Set<string>()

  for (const entry of input.entries) {
    ids.add(
      await findOrCreateEntry(db, list, { ...entry, createdBy: input.userId }),
    )
  }

  await db.delete(link).where(eq(link.coffeeId, input.coffeeId))

  if (!ids.size) return

  await db.insert(link).values(
    [...ids].map((id, position) => ({
      coffeeId: input.coffeeId,
      position,
      [entryId.name]: id,
    })) as never,
  )
}

export function entriesOf<Columns extends Record<string, PgColumn>>(
  db: Database,
  { list, link, entryId }: CoffeeList,
  coffeeId: string,
  columns?: Columns,
) {
  return db
    .select({
      id: sql<string>`${list.id}`,
      name: sql<string>`${list.name}`,
      ...(columns as Columns),
    })
    .from(link)
    .innerJoin(list, eq(list.id, entryId))
    .where(eq(link.coffeeId, coffeeId))
    .orderBy(asc(link.position))
}
