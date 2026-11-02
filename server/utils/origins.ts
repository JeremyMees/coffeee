import { asc, eq, inArray } from 'drizzle-orm'
import { defineEventHandler } from 'h3'
import { originListFields } from '#shared/utils/origins'
import type { OriginEntry, OriginListField } from '#shared/utils/origins'
import { originListSearchSchema } from '#shared/utils/schemas'
import type { Database } from '#server/db/database'
import {
  coffeeFarm,
  coffeeOrigin,
  coffeeRegion,
  coffeeWashingStation,
  farm,
  origin,
  region,
  washingStation,
} from '#server/db/schemas'
import { useDb } from '#server/utils/db'
import { describeEntries, entriesOf, findSimilar } from '#server/utils/lists'
import type { CoffeeList } from '#server/utils/lists'
import { requireUser } from '#server/utils/session'
import { readValidQuery } from '#server/utils/validation'

type OriginList = typeof region | typeof farm | typeof washingStation

const originLists: Record<OriginListField, CoffeeList<OriginList>> = {
  regions: { list: region, link: coffeeRegion, entryId: coffeeRegion.regionId },
  farms: { list: farm, link: coffeeFarm, entryId: coffeeFarm.farmId },
  washingStations: {
    list: washingStation,
    link: coffeeWashingStation,
    entryId: coffeeWashingStation.washingStationId,
  },
}

type Described = Record<OriginListField, OriginEntry[]> & {
  origins: string[]
}

export async function describeOrigins(
  db: Database,
  input: { coffeeId: string; userId: string; details: Described },
) {
  const { coffeeId, details } = input

  await db.delete(coffeeOrigin).where(eq(coffeeOrigin.coffeeId, coffeeId))
  await db.insert(coffeeOrigin).values(
    details.origins.map((originCode, position) => ({
      coffeeId,
      originCode,
      position,
    })),
  )

  for (const field of originListFields) {
    await describeEntries(db, originLists[field], {
      coffeeId,
      userId: input.userId,
      entries: details[field].map(picked => ({
        originCode: picked.origin,
        name: picked.name,
      })),
    })
  }
}

function originEntriesOf(
  db: Database,
  field: OriginListField,
  coffeeId: string,
) {
  const coffeeList = originLists[field]

  return entriesOf(db, coffeeList, coffeeId, {
    origin: coffeeList.list.originCode,
  })
}

export async function originsOf(db: Database, coffeeId: string) {
  const origins = await db
    .select({ code: origin.code, name: origin.name })
    .from(coffeeOrigin)
    .innerJoin(origin, eq(origin.code, coffeeOrigin.originCode))
    .where(eq(coffeeOrigin.coffeeId, coffeeId))
    .orderBy(asc(coffeeOrigin.position))

  return {
    origins,
    regions: await originEntriesOf(db, 'regions', coffeeId),
    farms: await originEntriesOf(db, 'farms', coffeeId),
    washingStations: await originEntriesOf(db, 'washingStations', coffeeId),
  }
}

export function findSimilarInOrigins(
  db: Database,
  list: OriginList,
  input: { origins: string[]; search: string },
) {
  return findSimilar(db, list, input.search, {
    where: inArray(list.originCode, input.origins),
    columns: { origin: list.originCode },
  })
}

export function originListSearchHandler(list: OriginList) {
  return defineEventHandler(async event => {
    await requireUser(event)
    const query = readValidQuery(event, originListSearchSchema)

    return findSimilarInOrigins(useDb(), list, query)
  })
}
