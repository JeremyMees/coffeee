import { and, asc, desc, eq, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type {
  CatalogFilterKind,
  CatalogMatch,
  CatalogSearch,
} from '#shared/types/catalog'
import type { LibraryFilterSearch, LibraryOption } from '#shared/types/library'
import { roastedForLabels, roastLevelLabels } from '#shared/utils/coffee'
import { nameKey } from '#shared/utils/names'
import type { Database } from '#server/types/database'
import type { Viewer } from '#server/types/coffees'
import { coffee, purchase, roaster } from '#server/db/schemas'
import { coffeeColumns } from '#server/utils/coffees'
import {
  cardDescriptionsOf,
  describedWith,
  descriptionFilterOptions,
  descriptionSearch,
} from '#server/utils/descriptions'
import type { DescribedField } from '#server/utils/descriptions'
import {
  byCommunityRating,
  communityRatingColumns,
} from '#server/utils/verdicts'

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

function searchedFor(key: string, described: SQL | undefined) {
  if (!key) return undefined

  return or(
    sql`strpos(${coffee.nameKey}, ${key}) > 0`,
    sql`strpos(${roaster.nameKey}, ${key}) > 0`,
    described,
  )
}

function catalogWhere(input: {
  shelfId: string
  search: CatalogSearch
  key: string
  described: SQL | undefined
}) {
  const { search } = input

  return and(
    searchedFor(input.key, input.described),
    search.mine ? onShelf(input.shelfId) : undefined,
    search.roasterId ? eq(coffee.roasterId, search.roasterId) : undefined,
    search.flavorNoteId
      ? describedWith('flavorNotes', search.flavorNoteId)
      : undefined,
    search.processId ? describedWith('processes', search.processId) : undefined,
    search.originCode ? describedWith('origins', search.originCode) : undefined,
    search.roastLevel ? eq(coffee.roastLevel, search.roastLevel) : undefined,
    search.roastedFor ? eq(coffee.roastedFor, search.roastedFor) : undefined,
  )
}

export async function listCatalog(
  db: Database,
  input: { shelfId: string; search: CatalogSearch },
) {
  const { search } = input
  const key = nameKey(search.search)
  const found = await descriptionSearch(db, search.search)

  const rows = await db
    .select({
      ...coffeeColumns,
      roasterId: coffee.roasterId,
      roastedOn: latestRoastOn(input.shelfId),
      communityRating: communityRatingColumns,
      onShelf: onShelf(input.shelfId),
      total: sql<number>`cast(count(*) over () as integer)`,
    })
    .from(coffee)
    .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
    .where(catalogWhere({ ...input, key, described: found.where }))
    .orderBy(
      ...(search.sort === 'communityRating' ? byCommunityRating() : []),
      desc(coffee.createdAt),
      asc(coffee.id),
    )
    .limit(search.pageSize)
    .offset(search.page * search.pageSize)
  const coffeeIds = rows.map(row => row.id)
  const cards = await cardDescriptionsOf(db, coffeeIds)
  const described = await found.matchesOf(coffeeIds)

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
      ...(described.get(row.id) ?? []),
    ]
  }

  return {
    total: rows[0]?.total ?? 0,
    coffees: rows.map(({ total: _total, ...row }) => ({
      ...row,
      ...cards.get(row.id)!,
      matches: matchesOf(row),
    })),
  }
}

const describedFilters: Record<
  Exclude<CatalogFilterKind, 'roasters' | 'roast-levels' | 'roasted-for'>,
  DescribedField
> = {
  'flavor-notes': 'flavorNotes',
  processes: 'processes',
  origins: 'origins',
}

function roasterOptions(db: Database, key: string) {
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
  const limit = search.pageSize + 1
  const rows =
    kind === 'roast-levels' || kind === 'roasted-for'
      ? fixedOptions[kind]
          .filter(option => nameKey(option.label).includes(key))
          .slice(start, start + limit)
      : kind === 'roasters'
        ? await roasterOptions(db, key).limit(limit).offset(start)
        : await descriptionFilterOptions(db, describedFilters[kind], {
            search: search.search,
            limit,
            offset: start,
          })

  return {
    options: rows
      .slice(0, search.pageSize)
      .map(({ value, label }): LibraryOption => ({ value, label })),
    hasMore: rows.length > search.pageSize,
  }
}
