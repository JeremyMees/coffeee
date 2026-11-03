import { count, desc, eq, sql } from 'drizzle-orm'
import type { Database } from '#server/types/database'
import type { ProfileStats } from '#shared/types/stats'
import { coffee, coffeeVerdict, purchase, roaster } from '#server/db/schemas'

export async function profileStatsOf(
  db: Database,
  userId: string,
): Promise<ProfileStats> {
  const [bought] = await db
    .select({
      bags: count(),
      grams: sql<number>`cast(coalesce(sum(${purchase.sizeGrams}), 0) as integer)`,
      spentCents: sql<number>`cast(coalesce(sum(${purchase.priceCents}), 0) as integer)`,
    })
    .from(purchase)
    .where(eq(purchase.addedBy, userId))

  const [judged] = await db
    .select({
      rated: count(coffeeVerdict.rating),
      averageRating: sql<
        number | null
      >`cast(avg(${coffeeVerdict.rating}) as double precision)`,
      wouldBuyAgain: sql<number>`cast(count(*) filter (where ${coffeeVerdict.wouldBuyAgain}) as integer)`,
    })
    .from(coffeeVerdict)
    .where(eq(coffeeVerdict.userId, userId))

  const [top] = await db
    .select({ name: roaster.name })
    .from(purchase)
    .innerJoin(coffee, eq(coffee.id, purchase.coffeeId))
    .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
    .where(eq(purchase.addedBy, userId))
    .groupBy(roaster.id, roaster.name)
    .orderBy(desc(count()), roaster.name)
    .limit(1)

  return { ...bought!, ...judged!, topRoaster: top?.name ?? null }
}
