import { and, asc, eq, inArray, or, sql } from 'drizzle-orm'
import type { SQLWrapper } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'
import type { BrowsingFilterKind, BrowsingSearch } from '#shared/types/browsing'
import type { CatalogMatch } from '#shared/types/catalog'
import type { LibraryFilterSearch, LibraryOption } from '#shared/types/library'
import { roastedForLabels, roastLevelLabels } from '#shared/utils/coffee'
import { nameKey } from '#shared/utils/names'
import type { Database } from '#server/types/database'
import { coffee, purchase, roaster } from '#server/db/schemas'
import {
  cardDescriptionsOf,
  describedWith,
  descriptionFilterOptions,
  descriptionSearch,
} from '#server/utils/descriptions'
import type { DescribedField } from '#server/utils/descriptions'

type BrowsedRow = { id: string; name: string; roaster: string; total: number }

type DescribedFilter = Exclude<
  BrowsingFilterKind,
  'roasters' | 'roast-levels' | 'roasted-for'
>

const describedFilters: Record<
  DescribedFilter,
  {
    field: DescribedField
    param: 'flavorNoteId' | 'originCode' | 'processId' | 'varietalId'
  }
> = {
  'flavor-notes': { field: 'flavorNotes', param: 'flavorNoteId' },
  origins: { field: 'origins', param: 'originCode' },
  processes: { field: 'processes', param: 'processId' },
  varietals: { field: 'varietals', param: 'varietalId' },
}

const fixedFilters = {
  'roast-levels': { column: coffee.roastLevel, labels: roastLevelLabels },
  'roasted-for': { column: coffee.roastedFor, labels: roastedForLabels },
}

function anyOf(column: PgColumn, values: string[]) {
  return values.length ? inArray(column, values) : undefined
}

export const browsedTotal = sql<number>`cast(count(*) over () as integer)`

export function boughtOn(shelfId: string) {
  return sql<boolean>`exists (
    select 1 from ${purchase}
    where ${purchase.shelfId} = ${shelfId}
      and ${purchase.coffeeId} = ${coffee.id}
  )`
}

export function coffeesBoughtOn(db: Database, shelfId: string) {
  return db
    .select({ coffeeId: purchase.coffeeId })
    .from(purchase)
    .where(eq(purchase.shelfId, shelfId))
}

function nameMatches(
  row: Pick<BrowsedRow, 'name' | 'roaster'>,
  key: string,
): CatalogMatch[] {
  return [
    ...(nameKey(row.name).includes(key)
      ? [{ field: 'name' as const, name: row.name }]
      : []),
    ...(nameKey(row.roaster).includes(key)
      ? [{ field: 'roaster' as const, name: row.roaster }]
      : []),
  ]
}

export async function browseCoffees(db: Database, search: BrowsingSearch) {
  const key = nameKey(search.search)
  const described = await descriptionSearch(db, search.search)

  const where = and(
    key
      ? or(
          sql`strpos(${coffee.nameKey}, ${key}) > 0`,
          sql`strpos(${roaster.nameKey}, ${key}) > 0`,
          described.where,
        )
      : undefined,
    anyOf(coffee.roasterId, search.roasterId),
    ...Object.values(describedFilters).flatMap(({ field, param }) =>
      search[param].map(value => describedWith(field, value)),
    ),
    anyOf(coffee.roastLevel, search.roastLevel),
    anyOf(coffee.roastedFor, search.roastedFor),
  )

  async function page<Row extends BrowsedRow>(rows: Row[]) {
    const coffeeIds = rows.map(row => row.id)
    const cards = await cardDescriptionsOf(db, coffeeIds)
    const matched = await described.matchesOf(coffeeIds)

    return {
      total: rows[0]?.total ?? 0,
      coffees: rows.map(({ total: _total, ...row }) => ({
        ...row,
        ...cards.get(row.id)!,
        matches: key
          ? [...nameMatches(row, key), ...(matched.get(row.id) ?? [])]
          : [],
      })),
    }
  }

  return { where, page }
}

function roasterOptions(
  db: Database,
  input: { key: string; among?: SQLWrapper },
) {
  return db
    .selectDistinct({
      value: roaster.id,
      label: roaster.name,
      key: roaster.nameKey,
    })
    .from(coffee)
    .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
    .where(
      and(
        sql`strpos(${roaster.nameKey}, ${input.key}) > 0`,
        input.among ? inArray(coffee.id, input.among) : undefined,
      ),
    )
    .orderBy(asc(roaster.nameKey), asc(roaster.id))
}

async function fixedOptions(
  db: Database,
  kind: keyof typeof fixedFilters,
  among: SQLWrapper | undefined,
) {
  const { column, labels } = fixedFilters[kind]
  const options: LibraryOption[] = Object.entries(labels).map(
    ([value, label]) => ({ value, label }),
  )

  if (!among) return options

  const used = await db
    .selectDistinct({ value: column })
    .from(coffee)
    .where(inArray(coffee.id, among))
  const values = new Set<string>(used.map(row => row.value))

  return options.filter(option => values.has(option.value))
}

export async function browsingFilterOptions(
  db: Database,
  input: {
    kind: BrowsingFilterKind
    search: LibraryFilterSearch
    among?: SQLWrapper
  },
) {
  const { kind, search, among } = input
  const key = nameKey(search.search)
  const start = search.page * search.pageSize
  const limit = search.pageSize + 1
  const rows =
    kind === 'roast-levels' || kind === 'roasted-for'
      ? (await fixedOptions(db, kind, among))
          .filter(option => nameKey(option.label).includes(key))
          .slice(start, start + limit)
      : kind === 'roasters'
        ? await roasterOptions(db, { key, among }).limit(limit).offset(start)
        : await descriptionFilterOptions(db, describedFilters[kind].field, {
            search: search.search,
            limit,
            offset: start,
            among,
          })

  return {
    options: rows
      .slice(0, search.pageSize)
      .map(({ value, label }): LibraryOption => ({ value, label })),
    hasMore: rows.length > search.pageSize,
  }
}
