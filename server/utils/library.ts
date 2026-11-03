import { and, asc, desc, eq, gte, max, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type {
  LibraryColumn,
  LibraryFilterKind,
  LibraryFilterSearch,
  LibraryOption,
  LibrarySearch,
} from '#shared/types/library'
import { nameKey } from '#shared/utils/names'
import type { Database } from '#server/types/database'
import {
  coffee,
  coffeeFlavorNote,
  coffeeOrigin,
  coffeeVerdict,
  flavorNote,
  origin,
  purchase,
  roaster,
} from '#server/db/schemas'
import { coffeeColumns, flavorNotesOf } from '#server/utils/coffees'
import { originNamesOf } from '#server/utils/origins'
import { verdictOn } from '#server/utils/verdicts'

const pricedPurchase = alias(purchase, 'pricedPurchase')

function latestPriceOf(shelfId: string) {
  return sql<number | null>`(
    select ${pricedPurchase.priceCents}
    from ${purchase} as ${sql.identifier('pricedPurchase')}
    where ${pricedPurchase.shelfId} = ${shelfId}
      and ${pricedPurchase.coffeeId} = ${coffee.id}
      and ${pricedPurchase.priceCents} is not null
    order by ${pricedPurchase.purchasedOn} desc, ${pricedPurchase.createdAt} desc
    limit 1
  )`
}

const originNames = sql<string | null>`(
  select string_agg(${origin.name}, ', ' order by ${coffeeOrigin.position})
  from ${coffeeOrigin}
  inner join ${origin} on ${origin.code} = ${coffeeOrigin.originCode}
  where ${coffeeOrigin.coffeeId} = ${coffee.id}
)`

function libraryWhere(input: { shelfId: string; search: LibrarySearch }) {
  const { search } = input

  return and(
    eq(purchase.shelfId, input.shelfId),
    search.favourites
      ? and(eq(coffeeVerdict.wouldBuyAgain, true), gte(coffeeVerdict.rating, 4))
      : undefined,
    search.roasterId ? eq(coffee.roasterId, search.roasterId) : undefined,
    search.flavorNoteId
      ? sql`exists (select 1 from ${coffeeFlavorNote} where ${coffeeFlavorNote.coffeeId} = ${coffee.id} and ${coffeeFlavorNote.flavorNoteId} = ${search.flavorNoteId})`
      : undefined,
    search.originCode
      ? sql`exists (select 1 from ${coffeeOrigin} where ${coffeeOrigin.coffeeId} = ${coffee.id} and ${coffeeOrigin.originCode} = ${search.originCode})`
      : undefined,
  )
}

function sortedBy(column: LibraryColumn, shelfId: string): SQL {
  const values: Record<LibraryColumn, SQL> = {
    rating: sql`${coffeeVerdict.rating}`,
    roaster: sql`${roaster.nameKey}`,
    origin: originNames,
    roastLevel: sql`${coffee.roastLevel}`,
    latestPrice: latestPriceOf(shelfId),
    lastBought: sql`${max(purchase.purchasedOn)}`,
  }

  return values[column]
}

export async function listLibrary(
  db: Database,
  input: { shelfId: string; userId: string; search: LibrarySearch },
) {
  const { search } = input
  const order = search.sort
    ? [
        search.direction === 'ascending'
          ? sql`${sortedBy(search.sort, input.shelfId)} asc nulls last`
          : sql`${sortedBy(search.sort, input.shelfId)} desc nulls last`,
      ]
    : []

  const rows = await db
    .select({
      ...coffeeColumns,
      roasterId: coffee.roasterId,
      roastedOn: max(purchase.roastedOn),
      lastBought: max(purchase.purchasedOn),
      rating: coffeeVerdict.rating,
      wouldBuyAgain: coffeeVerdict.wouldBuyAgain,
      latestPriceCents: latestPriceOf(input.shelfId),
      total: sql<number>`cast(count(*) over () as integer)`,
    })
    .from(purchase)
    .innerJoin(coffee, eq(coffee.id, purchase.coffeeId))
    .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
    .leftJoin(coffeeVerdict, verdictOn(input.userId))
    .where(libraryWhere(input))
    .groupBy(
      coffee.id,
      roaster.id,
      coffeeVerdict.rating,
      coffeeVerdict.wouldBuyAgain,
    )
    .orderBy(
      ...order,
      desc(max(purchase.purchasedOn)),
      desc(max(purchase.createdAt)),
      asc(coffee.id),
    )
    .limit(search.pageSize)
    .offset(search.page * search.pageSize)
  const coffeeIds = rows.map(row => row.id)
  const notes = await flavorNotesOf(db, coffeeIds)
  const origins = await originNamesOf(db, coffeeIds)

  return {
    total: rows[0]?.total ?? 0,
    coffees: rows.map(({ total: _total, ...row }) => ({
      ...row,
      lastBought: row.lastBought!,
      wouldBuyAgain: row.wouldBuyAgain ?? false,
      flavorNotes: notes.get(row.id) ?? [],
      origins: origins.get(row.id) ?? [],
    })),
  }
}

function filterOptionsQuery(
  db: Database,
  input: { shelfId: string; kind: LibraryFilterKind; key: string },
) {
  const onShelf = eq(purchase.shelfId, input.shelfId)

  if (input.kind === 'roasters') {
    return db
      .selectDistinct({
        value: roaster.id,
        label: roaster.name,
        key: roaster.nameKey,
      })
      .from(purchase)
      .innerJoin(coffee, eq(coffee.id, purchase.coffeeId))
      .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
      .where(and(onShelf, sql`strpos(${roaster.nameKey}, ${input.key}) > 0`))
      .orderBy(asc(roaster.nameKey), asc(roaster.id))
      .$dynamic()
  }

  if (input.kind === 'flavor-notes') {
    return db
      .selectDistinct({
        value: flavorNote.id,
        label: flavorNote.name,
        key: flavorNote.nameKey,
      })
      .from(purchase)
      .innerJoin(
        coffeeFlavorNote,
        eq(coffeeFlavorNote.coffeeId, purchase.coffeeId),
      )
      .innerJoin(flavorNote, eq(flavorNote.id, coffeeFlavorNote.flavorNoteId))
      .where(and(onShelf, sql`strpos(${flavorNote.nameKey}, ${input.key}) > 0`))
      .orderBy(asc(flavorNote.nameKey), asc(flavorNote.id))
      .$dynamic()
  }

  return db
    .selectDistinct({ value: origin.code, label: origin.name })
    .from(purchase)
    .innerJoin(coffeeOrigin, eq(coffeeOrigin.coffeeId, purchase.coffeeId))
    .innerJoin(origin, eq(origin.code, coffeeOrigin.originCode))
    .where(and(onShelf, sql`strpos(lower(${origin.name}), ${input.key}) > 0`))
    .orderBy(asc(origin.name))
    .$dynamic()
}

export async function listLibraryFilterOptions(
  db: Database,
  input: {
    shelfId: string
    kind: LibraryFilterKind
    search: LibraryFilterSearch
  },
) {
  const { search } = input
  const rows = await filterOptionsQuery(db, {
    shelfId: input.shelfId,
    kind: input.kind,
    key: nameKey(search.search),
  })
    .limit(search.pageSize + 1)
    .offset(search.page * search.pageSize)

  return {
    options: rows
      .slice(0, search.pageSize)
      .map(({ value, label }): LibraryOption => ({ value, label })),
    hasMore: rows.length > search.pageSize,
  }
}
