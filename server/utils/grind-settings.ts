import { and, asc, desc, eq, ne, sql } from 'drizzle-orm'
import type { GrindSettingChange } from '#shared/types/grinders'
import type { Database } from '#server/types/database'
import {
  brewMethod,
  coffee,
  grinder,
  grinderBrand,
  grindSetting,
  shelfGrinder,
  user,
} from '#server/db/schemas'

const settingColumns = {
  grinderId: grindSetting.grinderId,
  brand: grinderBrand.name,
  model: grinder.name,
  brewMethodId: grindSetting.brewMethodId,
  brewMethod: brewMethod.name,
  setting: grindSetting.setting,
}

export function grindSettingsOf(
  db: Database,
  input: { userId: string; coffeeId: string },
) {
  return db
    .select(settingColumns)
    .from(grindSetting)
    .innerJoin(grinder, eq(grinder.id, grindSetting.grinderId))
    .innerJoin(grinderBrand, eq(grinderBrand.id, grinder.brandId))
    .innerJoin(brewMethod, eq(brewMethod.id, grindSetting.brewMethodId))
    .where(
      and(
        eq(grindSetting.userId, input.userId),
        eq(grindSetting.coffeeId, input.coffeeId),
      ),
    )
    .orderBy(
      asc(grinderBrand.nameKey),
      asc(grinder.nameKey),
      asc(brewMethod.position),
    )
}

export function otherGrindSettingsOf(
  db: Database,
  input: { shelfId: string; userId: string; coffeeId: string },
) {
  const owned = sql<boolean>`${shelfGrinder.grinderId} is not null`

  return db
    .select({
      ...settingColumns,
      userId: grindSetting.userId,
      name: user.name,
      ownedByShelf: owned,
    })
    .from(grindSetting)
    .innerJoin(grinder, eq(grinder.id, grindSetting.grinderId))
    .innerJoin(grinderBrand, eq(grinderBrand.id, grinder.brandId))
    .innerJoin(brewMethod, eq(brewMethod.id, grindSetting.brewMethodId))
    .innerJoin(user, eq(user.id, grindSetting.userId))
    .leftJoin(
      shelfGrinder,
      and(
        eq(shelfGrinder.shelfId, input.shelfId),
        eq(shelfGrinder.grinderId, grindSetting.grinderId),
      ),
    )
    .where(
      and(
        eq(grindSetting.coffeeId, input.coffeeId),
        ne(grindSetting.userId, input.userId),
      ),
    )
    .orderBy(
      desc(owned),
      asc(grinderBrand.nameKey),
      asc(grinder.nameKey),
      asc(brewMethod.position),
      asc(user.name),
    )
}

async function missingFor(
  db: Database,
  input: { shelfId: string; coffeeId: string; change: GrindSettingChange },
) {
  const [foundCoffee] = await db
    .select({ id: coffee.id })
    .from(coffee)
    .where(eq(coffee.id, input.coffeeId))

  if (!foundCoffee) return 'Coffee not found'

  const [owned] = await db
    .select({ id: shelfGrinder.grinderId })
    .from(shelfGrinder)
    .where(
      and(
        eq(shelfGrinder.shelfId, input.shelfId),
        eq(shelfGrinder.grinderId, input.change.grinderId),
      ),
    )

  if (!owned) return 'This shelf does not own that grinder'

  const [method] = await db
    .select({ id: brewMethod.id })
    .from(brewMethod)
    .where(eq(brewMethod.id, input.change.brewMethodId))

  if (!method) return 'Brew method not found'
}

export async function setGrindSetting(
  db: Database,
  input: {
    shelfId: string
    coffeeId: string
    userId: string
    change: GrindSettingChange
  },
) {
  const missing = await missingFor(db, input)

  if (missing) return { outcome: 'missing' as const, message: missing }

  const { grinderId, brewMethodId, setting } = input.change
  const key = {
    userId: input.userId,
    coffeeId: input.coffeeId,
    grinderId,
    brewMethodId,
  }

  if (setting === null) {
    await db
      .delete(grindSetting)
      .where(
        and(
          eq(grindSetting.userId, key.userId),
          eq(grindSetting.coffeeId, key.coffeeId),
          eq(grindSetting.grinderId, key.grinderId),
          eq(grindSetting.brewMethodId, key.brewMethodId),
        ),
      )
  } else {
    const change = { setting, updatedAt: new Date() }

    await db
      .insert(grindSetting)
      .values({ ...key, ...change })
      .onConflictDoUpdate({
        target: [
          grindSetting.userId,
          grindSetting.coffeeId,
          grindSetting.grinderId,
          grindSetting.brewMethodId,
        ],
        set: change,
      })
  }

  return {
    outcome: 'saved' as const,
    grindSetting: { grinderId, brewMethodId, setting },
  }
}
