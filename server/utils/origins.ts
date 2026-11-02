import { and, asc, eq, inArray } from 'drizzle-orm'
import { nameKey } from '#shared/utils/names'
import type { Database } from '#server/db/database'
import { coffeeOrigin, coffeeRegion, origin, region } from '#server/db/schemas'
import { findSimilar } from '#server/utils/lists'

interface Described {
  origins: string[]
  regions: { origin: string; name: string }[]
}

async function findOrCreateRegion(
  db: Database,
  input: { originCode: string; name: string; createdBy: string },
) {
  const key = nameKey(input.name)

  await db
    .insert(region)
    .values({ ...input, nameKey: key })
    .onConflictDoNothing({ target: [region.originCode, region.nameKey] })

  const [found] = await db
    .select({ id: region.id })
    .from(region)
    .where(
      and(eq(region.originCode, input.originCode), eq(region.nameKey, key)),
    )

  return found!
}

export async function describeOrigins(
  db: Database,
  input: { coffeeId: string; userId: string; details: Described },
) {
  const { coffeeId, details } = input

  await db.delete(coffeeOrigin).where(eq(coffeeOrigin.coffeeId, coffeeId))
  await db.delete(coffeeRegion).where(eq(coffeeRegion.coffeeId, coffeeId))

  await db.insert(coffeeOrigin).values(
    details.origins.map((originCode, position) => ({
      coffeeId,
      originCode,
      position,
    })),
  )

  const regionIds = new Set<string>()

  for (const picked of details.regions) {
    const { id } = await findOrCreateRegion(db, {
      originCode: picked.origin,
      name: picked.name,
      createdBy: input.userId,
    })
    regionIds.add(id)
  }

  if (regionIds.size) {
    await db.insert(coffeeRegion).values(
      [...regionIds].map((regionId, position) => ({
        coffeeId,
        regionId,
        position,
      })),
    )
  }
}

export async function originsOf(db: Database, coffeeId: string) {
  const origins = await db
    .select({ code: origin.code, name: origin.name })
    .from(coffeeOrigin)
    .innerJoin(origin, eq(origin.code, coffeeOrigin.originCode))
    .where(eq(coffeeOrigin.coffeeId, coffeeId))
    .orderBy(asc(coffeeOrigin.position))

  const regions = await db
    .select({ id: region.id, name: region.name, origin: region.originCode })
    .from(coffeeRegion)
    .innerJoin(region, eq(region.id, coffeeRegion.regionId))
    .where(eq(coffeeRegion.coffeeId, coffeeId))
    .orderBy(asc(coffeeRegion.position))

  return { origins, regions }
}

export function findSimilarRegions(
  db: Database,
  input: { origins: string[]; search: string },
) {
  return findSimilar(db, region, input.search, {
    where: inArray(region.originCode, input.origins),
    columns: { origin: region.originCode },
  })
}
