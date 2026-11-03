import { and, eq } from 'drizzle-orm'
import type { Database } from '#server/types/database'
import type { CoffeeList } from '#server/types/lists'
import type { Move } from '#server/types/merges'
import {
  brewMethod,
  coffee,
  coffeeVerdict,
  grinder,
  grinderBrand,
  grindSetting,
  purchase,
  roaster,
  shelfGrinder,
} from '#server/db/schemas'
import { moveReferences } from '#server/utils/lists'

export async function mergeLinkedEntries(
  db: Database,
  { list, link, entryId }: CoffeeList,
  move: Move,
) {
  await moveReferences(db, link, entryId, move)
  await db.delete(list).where(eq(list.id, move.from))

  return [] as (string | null)[]
}

export async function mergeCoffees(db: Database, move: Move) {
  const photos = { photoUrl: coffee.photoUrl }
  const [from] = await db
    .select(photos)
    .from(coffee)
    .where(eq(coffee.id, move.from))
  const [to] = await db
    .select(photos)
    .from(coffee)
    .where(eq(coffee.id, move.to))

  await db
    .update(purchase)
    .set({ coffeeId: move.to })
    .where(eq(purchase.coffeeId, move.from))
  await moveReferences(db, coffeeVerdict, coffeeVerdict.coffeeId, move)
  await moveReferences(db, grindSetting, grindSetting.coffeeId, move)

  const photoMoves = !to!.photoUrl && from!.photoUrl

  if (photoMoves) {
    await db
      .update(coffee)
      .set({ photoUrl: from!.photoUrl })
      .where(eq(coffee.id, move.to))
  }

  await db.delete(coffee).where(eq(coffee.id, move.from))

  return photoMoves ? [] : [from!.photoUrl]
}

export async function mergeRoasters(db: Database, move: Move) {
  const photos: (string | null)[] = []
  const coffees = await db
    .select({ id: coffee.id, nameKey: coffee.nameKey })
    .from(coffee)
    .where(eq(coffee.roasterId, move.from))

  for (const moved of coffees) {
    const [same] = await db
      .select({ id: coffee.id })
      .from(coffee)
      .where(
        and(eq(coffee.roasterId, move.to), eq(coffee.nameKey, moved.nameKey)),
      )

    if (same) {
      photos.push(...(await mergeCoffees(db, { from: moved.id, to: same.id })))
    } else {
      await db
        .update(coffee)
        .set({ roasterId: move.to })
        .where(eq(coffee.id, moved.id))
    }
  }

  const details = {
    website: roaster.website,
    countryCode: roaster.countryCode,
    city: roaster.city,
    logoUrl: roaster.logoUrl,
  }
  const [from] = await db
    .select(details)
    .from(roaster)
    .where(eq(roaster.id, move.from))
  const [to] = await db
    .select(details)
    .from(roaster)
    .where(eq(roaster.id, move.to))

  await db.delete(roaster).where(eq(roaster.id, move.from))
  await db
    .update(roaster)
    .set({
      website: to!.website ?? from!.website,
      countryCode: to!.countryCode ?? from!.countryCode,
      city: to!.city ?? from!.city,
      logoUrl: to!.logoUrl ?? from!.logoUrl,
    })
    .where(eq(roaster.id, move.to))

  return [...photos, to!.logoUrl ? from!.logoUrl : null]
}

export async function mergeGrinders(db: Database, move: Move) {
  await moveReferences(db, shelfGrinder, shelfGrinder.grinderId, move)
  await moveReferences(db, grindSetting, grindSetting.grinderId, move)
  await db.delete(grinder).where(eq(grinder.id, move.from))

  return [] as (string | null)[]
}

export async function mergeGrinderBrands(db: Database, move: Move) {
  const grinders = await db
    .select({ id: grinder.id, nameKey: grinder.nameKey })
    .from(grinder)
    .where(eq(grinder.brandId, move.from))

  for (const moved of grinders) {
    const [same] = await db
      .select({ id: grinder.id })
      .from(grinder)
      .where(
        and(eq(grinder.brandId, move.to), eq(grinder.nameKey, moved.nameKey)),
      )

    if (same) {
      await mergeGrinders(db, { from: moved.id, to: same.id })
    } else {
      await db
        .update(grinder)
        .set({ brandId: move.to })
        .where(eq(grinder.id, moved.id))
    }
  }

  await db.delete(grinderBrand).where(eq(grinderBrand.id, move.from))

  return [] as (string | null)[]
}

export async function mergeBrewMethods(db: Database, move: Move) {
  await moveReferences(db, grindSetting, grindSetting.brewMethodId, move)
  await db.delete(brewMethod).where(eq(brewMethod.id, move.from))

  return [] as (string | null)[]
}
