import { and, asc, eq, inArray } from 'drizzle-orm'
import type { NewGrinder } from '#shared/types/grinders'
import { nameKey } from '#shared/utils/names'
import type { Database } from '#server/types/database'
import { grinder, grinderBrand, shelfGrinder } from '#server/db/schemas'
import { findOrCreateEntry, findSimilar } from '#server/utils/lists'

export const grinderColumns = {
  id: grinder.id,
  brand: grinderBrand.name,
  model: grinder.name,
}

export function findGrinderModels(
  db: Database,
  input: { brand: string; search: string },
) {
  const brandIds = db
    .select({ id: grinderBrand.id })
    .from(grinderBrand)
    .where(eq(grinderBrand.nameKey, nameKey(input.brand)))

  return findSimilar(db, grinder, input.search, {
    where: inArray(grinder.brandId, brandIds),
  })
}

export function listShelfGrinders(db: Database, shelfId: string) {
  return db
    .select(grinderColumns)
    .from(shelfGrinder)
    .innerJoin(grinder, eq(grinder.id, shelfGrinder.grinderId))
    .innerJoin(grinderBrand, eq(grinderBrand.id, grinder.brandId))
    .where(eq(shelfGrinder.shelfId, shelfId))
    .orderBy(asc(grinderBrand.nameKey), asc(grinder.nameKey))
}

export function ownGrinder(
  db: Database,
  input: { shelfId: string; userId: string; grinder: NewGrinder },
) {
  return db.transaction(async tx => {
    const brandId = await findOrCreateEntry(tx, grinderBrand, {
      name: input.grinder.brand,
      createdBy: input.userId,
    })
    const key = nameKey(input.grinder.model)

    await tx
      .insert(grinder)
      .values({
        brandId,
        name: input.grinder.model,
        nameKey: key,
        createdBy: input.userId,
      })
      .onConflictDoNothing({ target: [grinder.brandId, grinder.nameKey] })

    const [found] = await tx
      .select(grinderColumns)
      .from(grinder)
      .innerJoin(grinderBrand, eq(grinderBrand.id, grinder.brandId))
      .where(and(eq(grinder.brandId, brandId), eq(grinder.nameKey, key)))

    await tx
      .insert(shelfGrinder)
      .values({ shelfId: input.shelfId, grinderId: found!.id })
      .onConflictDoNothing()

    return found!
  })
}

export async function disownGrinder(
  db: Database,
  input: { shelfId: string; grinderId: string },
) {
  const [removed] = await db
    .delete(shelfGrinder)
    .where(
      and(
        eq(shelfGrinder.shelfId, input.shelfId),
        eq(shelfGrinder.grinderId, input.grinderId),
      ),
    )
    .returning({ id: shelfGrinder.grinderId })

  return removed
}
