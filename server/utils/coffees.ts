import { and, asc, desc, eq, isNull, max } from 'drizzle-orm'
import { nameKey } from '#shared/utils/names'
import type { NewCoffee } from '#shared/utils/schemas'
import type { Database } from '../db/database'
import { coffee, purchase, roaster } from '../db/schemas'

const coffeeColumns = {
  id: coffee.id,
  name: coffee.name,
  roaster: roaster.name,
  roastLevel: coffee.roastLevel,
  roastedFor: coffee.roastedFor,
  colour: coffee.colour,
}

async function findOrCreateRoaster(
  db: Database,
  input: { name: string; createdBy: string },
) {
  const key = nameKey(input.name)

  await db
    .insert(roaster)
    .values({ ...input, nameKey: key })
    .onConflictDoNothing({ target: roaster.nameKey })

  const [found] = await db
    .select()
    .from(roaster)
    .where(eq(roaster.nameKey, key))

  return found!
}

async function findOrCreateCoffee(
  db: Database,
  input: Omit<typeof coffee.$inferInsert, 'nameKey'>,
) {
  const key = nameKey(input.name)

  await db
    .insert(coffee)
    .values({ ...input, nameKey: key })
    .onConflictDoNothing({ target: [coffee.roasterId, coffee.nameKey] })

  const [found] = await db
    .select(coffeeColumns)
    .from(coffee)
    .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
    .where(and(eq(coffee.roasterId, input.roasterId), eq(coffee.nameKey, key)))

  return found!
}

export function addCoffee(
  db: Database,
  input: { shelfId: string; userId: string; coffee: NewCoffee },
) {
  const details = input.coffee

  return db.transaction(async tx => {
    const { id: roasterId } = await findOrCreateRoaster(tx, {
      name: details.roaster,
      createdBy: input.userId,
    })
    const found = await findOrCreateCoffee(tx, {
      roasterId,
      name: details.name,
      roastLevel: details.roastLevel,
      roastedFor: details.roastedFor,
      colour: details.colour,
      createdBy: input.userId,
    })
    const [added] = await tx
      .insert(purchase)
      .values({
        shelfId: input.shelfId,
        coffeeId: found.id,
        purchasedOn: details.purchasedOn,
        roastedOn: details.roastedOn ?? null,
        sizeGrams: details.sizeGrams ?? null,
        priceCents:
          details.price == null ? null : Math.round(details.price * 100),
        addedBy: input.userId,
      })
      .returning({ id: purchase.id })

    return { coffee: found, purchase: added! }
  })
}

export function listRoasters(db: Database) {
  return db
    .select({ id: roaster.id, name: roaster.name })
    .from(roaster)
    .orderBy(asc(roaster.nameKey))
}

export function listStock(db: Database, shelfId: string) {
  return db
    .select({ ...coffeeColumns, roastedOn: max(purchase.roastedOn) })
    .from(purchase)
    .innerJoin(coffee, eq(coffee.id, purchase.coffeeId))
    .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
    .where(and(eq(purchase.shelfId, shelfId), isNull(purchase.finishedAt)))
    .groupBy(coffee.id, roaster.id)
    .orderBy(desc(max(purchase.purchasedOn)), desc(max(purchase.createdAt)))
}

export async function findShelfCoffee(
  db: Database,
  input: { shelfId: string; coffeeId: string },
) {
  const [found] = await db
    .select(coffeeColumns)
    .from(coffee)
    .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
    .where(eq(coffee.id, input.coffeeId))

  if (!found) return undefined

  const purchases = await db
    .select({
      id: purchase.id,
      purchasedOn: purchase.purchasedOn,
      roastedOn: purchase.roastedOn,
      sizeGrams: purchase.sizeGrams,
      priceCents: purchase.priceCents,
      finishedAt: purchase.finishedAt,
    })
    .from(purchase)
    .where(
      and(
        eq(purchase.shelfId, input.shelfId),
        eq(purchase.coffeeId, input.coffeeId),
      ),
    )
    .orderBy(desc(purchase.purchasedOn), desc(purchase.createdAt))

  return { ...found, purchases }
}
