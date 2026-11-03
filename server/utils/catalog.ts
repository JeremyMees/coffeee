import { and, asc, desc, eq, inArray, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type {
  CatalogFilterKind,
  CatalogMatch,
  CatalogMatchField,
  CatalogSearch,
} from '#shared/types/catalog'
import type { LibraryFilterSearch, LibraryOption } from '#shared/types/library'
import { roastedForLabels, roastLevelLabels } from '#shared/utils/coffee'
import { nameKey } from '#shared/utils/names'
import type { Database } from '#server/types/database'
import type { Viewer } from '#server/types/coffees'
import type { CoffeeList } from '#server/types/lists'
import {
  coffee,
  coffeeFarm,
  coffeeFlavorNote,
  coffeeOrigin,
  coffeeProcess,
  coffeeProducer,
  coffeeRegion,
  coffeeVerdict,
  farm,
  flavorNote,
  origin,
  processList,
  producer,
  purchase,
  region,
  roaster,
} from '#server/db/schemas'
import { coffeeColumns, flavorNotesOf } from '#server/utils/coffees'
import { originNamesOf } from '#server/utils/origins'
import { verdictOn } from '#server/utils/verdicts'

type ListMatchField = Exclude<CatalogMatchField, 'name' | 'roaster' | 'origin'>

const searchedLists: Record<ListMatchField, CoffeeList> = {
  flavorNote: {
    list: flavorNote,
    link: coffeeFlavorNote,
    entryId: coffeeFlavorNote.flavorNoteId,
  },
  region: { list: region, link: coffeeRegion, entryId: coffeeRegion.regionId },
  producer: {
    list: producer,
    link: coffeeProducer,
    entryId: coffeeProducer.producerId,
  },
  farm: { list: farm, link: coffeeFarm, entryId: coffeeFarm.farmId },
  process: {
    list: processList,
    link: coffeeProcess,
    entryId: coffeeProcess.processId,
  },
}

export function canEditCatalogEntry(viewer: Viewer, createdBy: string | null) {
  return viewer.role === 'admin' || viewer.id === createdBy
}

function onShelf(shelfId: string) {
  return sql<boolean>`exists (
    select 1 from ${purchase}
    where ${purchase.shelfId} = ${shelfId}
      and ${purchase.coffeeId} = ${coffee.id}
  )`
}

function latestRoastOn(shelfId: string) {
  return sql<string | null>`(
    select max(${purchase.roastedOn}) from ${purchase}
    where ${purchase.shelfId} = ${shelfId}
      and ${purchase.coffeeId} = ${coffee.id}
  )`
}

function linkedTo({ link, entryId }: CoffeeList, id: string) {
  return sql`exists (select 1 from ${link} where ${link.coffeeId} = ${coffee.id} and ${entryId} = ${id})`
}

function linkedMatching({ list, link, entryId }: CoffeeList, key: string) {
  return sql`exists (
    select 1 from ${link}
    inner join ${list} on ${list.id} = ${entryId}
    where ${link.coffeeId} = ${coffee.id}
      and strpos(${list.nameKey}, ${key}) > 0
  )`
}

function fromOrigins(codes: string[]) {
  return sql`exists (select 1 from ${coffeeOrigin} where ${coffeeOrigin.coffeeId} = ${coffee.id} and ${inArray(coffeeOrigin.originCode, codes)})`
}

async function originsMatching(db: Database, key: string) {
  if (!key) return []

  const origins = await db.select().from(origin)

  return origins
    .filter(found => nameKey(found.name).includes(key))
    .map(found => found.code)
}

function searchedFor(key: string, originCodes: string[]): SQL | undefined {
  if (!key) return undefined

  return or(
    sql`strpos(${coffee.nameKey}, ${key}) > 0`,
    sql`strpos(${roaster.nameKey}, ${key}) > 0`,
    ...Object.values(searchedLists).map(list => linkedMatching(list, key)),
    originCodes.length ? fromOrigins(originCodes) : undefined,
  )
}

function catalogWhere(input: {
  shelfId: string
  search: CatalogSearch
  key: string
  originCodes: string[]
}) {
  const { search } = input

  return and(
    searchedFor(input.key, input.originCodes),
    search.mine ? onShelf(input.shelfId) : undefined,
    search.roasterId ? eq(coffee.roasterId, search.roasterId) : undefined,
    search.flavorNoteId
      ? linkedTo(searchedLists.flavorNote, search.flavorNoteId)
      : undefined,
    search.processId
      ? linkedTo(searchedLists.process, search.processId)
      : undefined,
    search.originCode ? fromOrigins([search.originCode]) : undefined,
    search.roastLevel ? eq(coffee.roastLevel, search.roastLevel) : undefined,
    search.roastedFor ? eq(coffee.roastedFor, search.roastedFor) : undefined,
  )
}

async function listMatchesOf(db: Database, coffeeIds: string[], key: string) {
  const matches = new Map<string, CatalogMatch[]>()

  for (const [field, { list, link, entryId }] of Object.entries(
    searchedLists,
  )) {
    const linked = await db
      .select({ coffeeId: link.coffeeId, name: list.name })
      .from(link)
      .innerJoin(list, eq(list.id, entryId))
      .where(
        and(
          inArray(link.coffeeId, coffeeIds),
          sql`strpos(${list.nameKey}, ${key}) > 0`,
        ),
      )
      .orderBy(asc(link.position))

    for (const { coffeeId, name } of linked as {
      coffeeId: string
      name: string
    }[]) {
      matches.set(coffeeId, [
        ...(matches.get(coffeeId) ?? []),
        { field: field as ListMatchField, name },
      ])
    }
  }

  return matches
}

export async function listCatalog(
  db: Database,
  input: { shelfId: string; userId: string; search: CatalogSearch },
) {
  const { search } = input
  const key = nameKey(search.search)
  const originCodes = await originsMatching(db, key)

  const rows = await db
    .select({
      ...coffeeColumns,
      roasterId: coffee.roasterId,
      roastedOn: latestRoastOn(input.shelfId),
      rating: coffeeVerdict.rating,
      onShelf: onShelf(input.shelfId),
      total: sql<number>`cast(count(*) over () as integer)`,
    })
    .from(coffee)
    .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
    .leftJoin(coffeeVerdict, verdictOn(input.userId))
    .where(catalogWhere({ ...input, key, originCodes }))
    .orderBy(desc(coffee.createdAt), asc(coffee.id))
    .limit(search.pageSize)
    .offset(search.page * search.pageSize)
  const coffeeIds = rows.map(row => row.id)
  const notes = await flavorNotesOf(db, coffeeIds)
  const origins = await originNamesOf(db, coffeeIds)
  const listMatches =
    key && coffeeIds.length
      ? await listMatchesOf(db, coffeeIds, key)
      : new Map<string, CatalogMatch[]>()

  function matchesOf(
    row: Pick<(typeof rows)[number], 'id' | 'name' | 'roaster'>,
  ): CatalogMatch[] {
    if (!key) return []

    return [
      ...(nameKey(row.name).includes(key)
        ? [{ field: 'name' as const, name: row.name }]
        : []),
      ...(nameKey(row.roaster).includes(key)
        ? [{ field: 'roaster' as const, name: row.roaster }]
        : []),
      ...(origins.get(row.id) ?? [])
        .filter(found => originCodes.includes(found.code))
        .map(found => ({ field: 'origin' as const, name: found.name })),
      ...(listMatches.get(row.id) ?? []),
    ]
  }

  return {
    total: rows[0]?.total ?? 0,
    coffees: rows.map(({ total: _total, ...row }) => ({
      ...row,
      flavorNotes: notes.get(row.id) ?? [],
      origins: origins.get(row.id) ?? [],
      matches: matchesOf(row),
    })),
  }
}

function linkedOptions(
  db: Database,
  { list, link, entryId }: CoffeeList,
  key: string,
) {
  return db
    .selectDistinct({
      value: sql<string>`${list.id}`,
      label: sql<string>`${list.name}`,
      key: list.nameKey,
    })
    .from(link)
    .innerJoin(list, eq(list.id, entryId))
    .where(sql`strpos(${list.nameKey}, ${key}) > 0`)
    .orderBy(asc(list.nameKey), asc(list.id))
    .$dynamic()
}

function catalogOptionsQuery(
  db: Database,
  kind: Exclude<CatalogFilterKind, 'roast-levels' | 'roasted-for'>,
  key: string,
) {
  if (kind === 'roasters') {
    return db
      .selectDistinct({
        value: roaster.id,
        label: roaster.name,
        key: roaster.nameKey,
      })
      .from(coffee)
      .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
      .where(sql`strpos(${roaster.nameKey}, ${key}) > 0`)
      .orderBy(asc(roaster.nameKey), asc(roaster.id))
      .$dynamic()
  }

  if (kind === 'flavor-notes') {
    return linkedOptions(db, searchedLists.flavorNote, key)
  }

  if (kind === 'processes') {
    return linkedOptions(db, searchedLists.process, key)
  }

  return db
    .selectDistinct({ value: origin.code, label: origin.name })
    .from(coffeeOrigin)
    .innerJoin(origin, eq(origin.code, coffeeOrigin.originCode))
    .where(sql`strpos(lower(${origin.name}), ${key}) > 0`)
    .orderBy(asc(origin.name))
    .$dynamic()
}

const fixedOptions: Record<'roast-levels' | 'roasted-for', LibraryOption[]> = {
  'roast-levels': Object.entries(roastLevelLabels).map(([value, label]) => ({
    value,
    label,
  })),
  'roasted-for': Object.entries(roastedForLabels).map(([value, label]) => ({
    value,
    label,
  })),
}

export async function listCatalogFilterOptions(
  db: Database,
  input: { kind: CatalogFilterKind; search: LibraryFilterSearch },
) {
  const { kind, search } = input
  const key = nameKey(search.search)
  const start = search.page * search.pageSize
  const rows =
    kind === 'roast-levels' || kind === 'roasted-for'
      ? fixedOptions[kind]
          .filter(option => nameKey(option.label).includes(key))
          .slice(start, start + search.pageSize + 1)
      : await catalogOptionsQuery(db, kind, key)
          .limit(search.pageSize + 1)
          .offset(start)

  return {
    options: rows
      .slice(0, search.pageSize)
      .map(({ value, label }): LibraryOption => ({ value, label })),
    hasMore: rows.length > search.pageSize,
  }
}
