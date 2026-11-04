import { and, asc, eq, inArray, or, sql } from 'drizzle-orm'
import type { SQLWrapper } from 'drizzle-orm'
import { defineEventHandler } from 'h3'
import type {
  CatalogMatch,
  ListEntry,
  OriginListEntry,
} from '#shared/types/catalog'
import type {
  CoffeeDescription,
  DescriptionListField,
} from '#shared/types/coffee'
import type { OriginListField } from '#shared/types/origins'
import { descriptionListFields } from '#shared/utils/coffee'
import { nameKey } from '#shared/utils/names'
import { originListFields } from '#shared/utils/origins'
import { listSearchSchema, originListSearchSchema } from '#shared/utils/schemas'
import type { AdminListTable } from '#server/types/admin-lists'
import type { Database } from '#server/types/database'
import type { CoffeeList, NewListEntry } from '#server/types/lists'
import type { Move } from '#server/types/merges'
import {
  coffee,
  coffeeFarm,
  coffeeFlavorNote,
  coffeeOrigin,
  coffeeProcess,
  coffeeProducer,
  coffeeRegion,
  coffeeVarietal,
  coffeeWashingStation,
  farm,
  flavorNote,
  origin,
  processList,
  producer,
  region,
  varietal,
  washingStation,
} from '#server/db/schemas'
import { useDb } from '#server/utils/db'
import {
  findOrCreateEntry,
  findSimilar,
  moveReferences,
} from '#server/utils/lists'
import { requireUser } from '#server/utils/session'
import { readValidQuery } from '#server/utils/validation'

export type DescribedField = 'origins' | DescriptionListField

type Suggestions<Field extends DescriptionListField> =
  Field extends OriginListField ? OriginListEntry[] : ListEntry[]

const descriptionLists: Record<DescriptionListField, CoffeeList> = {
  regions: { list: region, link: coffeeRegion, entryId: coffeeRegion.regionId },
  farms: { list: farm, link: coffeeFarm, entryId: coffeeFarm.farmId },
  washingStations: {
    list: washingStation,
    link: coffeeWashingStation,
    entryId: coffeeWashingStation.washingStationId,
  },
  producers: {
    list: producer,
    link: coffeeProducer,
    entryId: coffeeProducer.producerId,
  },
  processes: {
    list: processList,
    link: coffeeProcess,
    entryId: coffeeProcess.processId,
  },
  varietals: {
    list: varietal,
    link: coffeeVarietal,
    entryId: coffeeVarietal.varietalId,
  },
  flavorNotes: {
    list: flavorNote,
    link: coffeeFlavorNote,
    entryId: coffeeFlavorNote.flavorNoteId,
  },
}

function isOriginListField(field: string): field is OriginListField {
  return (originListFields as readonly string[]).includes(field)
}

function newEntriesOf(
  description: CoffeeDescription,
  field: DescriptionListField,
): NewListEntry[] {
  if (isOriginListField(field)) {
    return description[field].map(picked => ({
      originCode: picked.origin,
      name: picked.name,
    }))
  }

  return description[field].map(name => ({ name }))
}

async function linkEntries(
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

export async function describeCoffee(
  db: Database,
  input: { coffeeId: string; userId: string; description: CoffeeDescription },
) {
  const { coffeeId, description } = input

  await db.delete(coffeeOrigin).where(eq(coffeeOrigin.coffeeId, coffeeId))

  if (description.origins.length) {
    await db.insert(coffeeOrigin).values(
      description.origins.map((originCode, position) => ({
        coffeeId,
        originCode,
        position,
      })),
    )
  }

  for (const field of descriptionListFields) {
    await linkEntries(db, descriptionLists[field], {
      coffeeId,
      userId: input.userId,
      entries: newEntriesOf(description, field),
    })
  }
}

function entriesOf(
  db: Database,
  field: Exclude<DescriptionListField, OriginListField>,
  coffeeId: string,
): Promise<ListEntry[]> {
  const { list, link, entryId } = descriptionLists[field]

  return db
    .select({ id: sql<string>`${list.id}`, name: sql<string>`${list.name}` })
    .from(link)
    .innerJoin(list, eq(list.id, entryId))
    .where(eq(link.coffeeId, coffeeId))
    .orderBy(asc(link.position))
}

function originEntriesOf(
  db: Database,
  field: OriginListField,
  coffeeId: string,
): Promise<OriginListEntry[]> {
  const { list, link, entryId } = descriptionLists[field]

  return db
    .select({
      id: sql<string>`${list.id}`,
      name: sql<string>`${list.name}`,
      origin: sql<string>`${list.originCode}`,
    })
    .from(link)
    .innerJoin(list, eq(list.id, entryId))
    .where(eq(link.coffeeId, coffeeId))
    .orderBy(asc(link.position))
}

function originsOf(db: Database, coffeeIds: string[]) {
  return db
    .select({
      coffeeId: coffeeOrigin.coffeeId,
      code: origin.code,
      name: origin.name,
    })
    .from(coffeeOrigin)
    .innerJoin(origin, eq(origin.code, coffeeOrigin.originCode))
    .where(inArray(coffeeOrigin.coffeeId, coffeeIds))
    .orderBy(asc(coffeeOrigin.position))
}

export async function descriptionOf(db: Database, coffeeId: string) {
  const origins = await originsOf(db, [coffeeId])

  return {
    origins: origins.map(({ code, name }) => ({ code, name })),
    regions: await originEntriesOf(db, 'regions', coffeeId),
    farms: await originEntriesOf(db, 'farms', coffeeId),
    washingStations: await originEntriesOf(db, 'washingStations', coffeeId),
    producers: await entriesOf(db, 'producers', coffeeId),
    processes: await entriesOf(db, 'processes', coffeeId),
    varietals: await entriesOf(db, 'varietals', coffeeId),
    flavorNotes: await entriesOf(db, 'flavorNotes', coffeeId),
  }
}

export async function cardDescriptionsOf(db: Database, coffeeIds: string[]) {
  const cards = new Map(
    coffeeIds.map(coffeeId => [
      coffeeId,
      {
        origins: [] as { code: string; name: string }[],
        flavorNotes: [] as ListEntry[],
      },
    ]),
  )

  if (!coffeeIds.length) return cards

  const { list, link, entryId } = descriptionLists.flavorNotes
  const notes = await db
    .select({
      coffeeId: sql<string>`${link.coffeeId}`,
      id: sql<string>`${list.id}`,
      name: sql<string>`${list.name}`,
    })
    .from(link)
    .innerJoin(list, eq(list.id, entryId))
    .where(inArray(link.coffeeId, coffeeIds))
    .orderBy(asc(link.position))

  for (const { coffeeId, ...note } of notes) {
    cards.get(coffeeId)!.flavorNotes.push(note)
  }

  for (const { coffeeId, ...found } of await originsOf(db, coffeeIds)) {
    cards.get(coffeeId)!.origins.push(found)
  }

  return cards
}

function fromOrigins(codes: string[]) {
  return sql`exists (select 1 from ${coffeeOrigin} where ${coffeeOrigin.coffeeId} = ${coffee.id} and ${inArray(coffeeOrigin.originCode, codes)})`
}

export function describedWith(field: DescribedField, value: string) {
  if (field === 'origins') return fromOrigins([value])

  const { link, entryId } = descriptionLists[field]

  return sql`exists (select 1 from ${link} where ${link.coffeeId} = ${coffee.id} and ${entryId} = ${value})`
}

function linkedMatching({ list, link, entryId }: CoffeeList, key: string) {
  return sql`exists (
    select 1 from ${link}
    inner join ${list} on ${list.id} = ${entryId}
    where ${link.coffeeId} = ${coffee.id}
      and strpos(${list.nameKey}, ${key}) > 0
  )`
}

async function originsMatching(db: Database, key: string) {
  const origins = await db.select().from(origin)

  return origins
    .filter(found => nameKey(found.name).includes(key))
    .map(found => found.code)
}

async function listMatchesOf(db: Database, coffeeIds: string[], key: string) {
  const matches: (CatalogMatch & { coffeeId: string })[] = []

  for (const field of descriptionListFields) {
    const { list, link, entryId } = descriptionLists[field]
    const linked = await db
      .select({
        coffeeId: sql<string>`${link.coffeeId}`,
        name: sql<string>`${list.name}`,
      })
      .from(link)
      .innerJoin(list, eq(list.id, entryId))
      .where(
        and(
          inArray(link.coffeeId, coffeeIds),
          sql`strpos(${list.nameKey}, ${key}) > 0`,
        ),
      )
      .orderBy(asc(link.position))

    matches.push(...linked.map(found => ({ ...found, field })))
  }

  return matches
}

export async function descriptionSearch(db: Database, search: string) {
  const key = nameKey(search)
  const noMatches = new Map<string, CatalogMatch[]>()

  if (!key) {
    return { where: undefined, matchesOf: async (_: string[]) => noMatches }
  }

  const originCodes = await originsMatching(db, key)

  async function matchesOf(coffeeIds: string[]) {
    const matches = new Map<string, CatalogMatch[]>()

    if (!coffeeIds.length) return matches

    const found = [
      ...(await originsOf(db, coffeeIds))
        .filter(linked => originCodes.includes(linked.code))
        .map(linked => ({
          coffeeId: linked.coffeeId,
          field: 'origins' as const,
          name: linked.name,
        })),
      ...(await listMatchesOf(db, coffeeIds, key)),
    ]

    for (const { coffeeId, ...match } of found) {
      matches.set(coffeeId, [...(matches.get(coffeeId) ?? []), match])
    }

    return matches
  }

  return {
    where: or(
      ...descriptionListFields.map(field =>
        linkedMatching(descriptionLists[field], key),
      ),
      originCodes.length ? fromOrigins(originCodes) : undefined,
    ),
    matchesOf,
  }
}

export const originNamesSort = sql<string | null>`(
  select string_agg(${origin.name}, ', ' order by ${coffeeOrigin.position})
  from ${coffeeOrigin}
  inner join ${origin} on ${origin.code} = ${coffeeOrigin.originCode}
  where ${coffeeOrigin.coffeeId} = ${coffee.id}
)`

export async function descriptionFilterOptions(
  db: Database,
  field: DescribedField,
  input: { search: string; limit: number; offset: number; among?: SQLWrapper },
) {
  const key = nameKey(input.search)

  if (field === 'origins') {
    return db
      .selectDistinct({ value: origin.code, label: origin.name })
      .from(coffeeOrigin)
      .innerJoin(origin, eq(origin.code, coffeeOrigin.originCode))
      .where(
        and(
          sql`strpos(lower(${origin.name}), ${key}) > 0`,
          input.among ? inArray(coffeeOrigin.coffeeId, input.among) : undefined,
        ),
      )
      .orderBy(asc(origin.name))
      .limit(input.limit)
      .offset(input.offset)
  }

  const { list, link, entryId } = descriptionLists[field]
  const rows = await db
    .selectDistinct({
      value: sql<string>`${list.id}`,
      label: sql<string>`${list.name}`,
      key: list.nameKey,
    })
    .from(link)
    .innerJoin(list, eq(list.id, entryId))
    .where(
      and(
        sql`strpos(${list.nameKey}, ${key}) > 0`,
        input.among ? inArray(link.coffeeId, input.among) : undefined,
      ),
    )
    .orderBy(asc(list.nameKey), asc(list.id))
    .limit(input.limit)
    .offset(input.offset)

  return rows.map(({ value, label }) => ({ value, label }))
}

export function suggestDescriptions<Field extends DescriptionListField>(
  db: Database,
  field: Field,
  input: { search: string; origins?: string[] },
): Promise<Suggestions<Field>> {
  const { list } = descriptionLists[field]
  const scope = list.originCode

  if (!scope) return findSimilar(db, list, input.search) as never

  return findSimilar(db, list, input.search, {
    where: inArray(scope, input.origins ?? []),
    columns: { origin: scope },
  }) as never
}

export function descriptionSuggestionHandler<
  Field extends DescriptionListField,
>(field: Field) {
  return defineEventHandler(async event => {
    await requireUser(event)
    const query = readValidQuery(
      event,
      isOriginListField(field) ? originListSearchSchema : listSearchSchema,
    )

    return suggestDescriptions(useDb(), field, query)
  })
}

async function mergeEntries(db: Database, coffeeList: CoffeeList, move: Move) {
  await moveReferences(db, coffeeList.link, coffeeList.entryId, move)
  await db.delete(coffeeList.list).where(eq(coffeeList.list.id, move.from))

  return [] as (string | null)[]
}

function adminList(field: DescriptionListField): AdminListTable {
  const coffeeList = descriptionLists[field]
  const { list, link, entryId } = coffeeList
  const scope = list.originCode

  return {
    table: list,
    scope,
    mergesWithinScope: scope !== undefined,
    detail: scope
      ? sql<
          string | null
        >`(select ${origin.name} from ${origin} where ${origin.code} = ${scope})`
      : sql<string | null>`null`,
    uses: sql<number>`(select cast(count(*) as integer) from ${link} where ${entryId} = ${list.id})`,
    merge: (db, move) => mergeEntries(db, coffeeList, move),
    remove: async (db, id) => {
      await db.delete(link).where(eq(entryId, id))
      await db.delete(list).where(eq(list.id, id))

      return { outcome: 'deleted', photoUrl: null }
    },
  }
}

export const descriptionAdminLists = Object.fromEntries(
  descriptionListFields.map(field => [field, adminList(field)]),
) as Record<DescriptionListField, AdminListTable>
