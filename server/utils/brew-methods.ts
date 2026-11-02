import { asc, sql } from 'drizzle-orm'
import type { NewBrewMethod } from '#shared/types/grinders'
import { nameKey } from '#shared/utils/names'
import type { Database } from '#server/types/database'
import { brewMethod } from '#server/db/schemas'

const brewMethodColumns = { id: brewMethod.id, name: brewMethod.name }

export function listBrewMethods(db: Database) {
  return db
    .select(brewMethodColumns)
    .from(brewMethod)
    .orderBy(asc(brewMethod.position))
}

export async function addBrewMethod(
  db: Database,
  input: { createdBy: string; brewMethod: NewBrewMethod },
) {
  const [added] = await db
    .insert(brewMethod)
    .values({
      name: input.brewMethod.name,
      nameKey: nameKey(input.brewMethod.name),
      position: sql`(select coalesce(max(${brewMethod.position}), -1) + 1 from ${brewMethod})`,
      createdBy: input.createdBy,
    })
    .onConflictDoNothing({ target: brewMethod.nameKey })
    .returning(brewMethodColumns)

  return added
}
