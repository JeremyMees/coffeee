import { and, asc, desc, eq, gte, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { PgColumn } from 'drizzle-orm/pg-core'
import type { BrowsingFilterKind } from '#shared/types/browsing'
import type {
  LibraryFilterSearch,
  LibrarySearch,
  LibrarySortBy,
} from '#shared/types/library'
import type { Database } from '#server/types/database'
import { coffee, coffeeVerdict, purchase, roaster } from '#server/db/schemas'
import {
  boughtOn,
  browseCoffees,
  browsedTotal,
  browsingFilterOptions,
  coffeesBoughtOn,
} from '#server/utils/browsing'
import { coffeeColumns } from '#server/utils/coffees'
import { originNamesSort } from '#server/utils/descriptions'
import { communityRatingColumns, verdictOn } from '#server/utils/verdicts'

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

function latestOf(column: PgColumn, shelfId: string) {
  return sql<string | null>`(
    select max(${column}) from ${purchase}
    where ${purchase.shelfId} = ${shelfId}
      and ${purchase.coffeeId} = ${coffee.id}
  )`
}

function lastAddedOn(shelfId: string) {
  return sql`(
    select max(${purchase.createdAt}) from ${purchase}
    where ${purchase.shelfId} = ${shelfId}
      and ${purchase.coffeeId} = ${coffee.id}
  )`
}

function libraryWhere(
  input: { shelfId: string; search: LibrarySearch },
  browsed: SQL | undefined,
) {
  return and(
    input.search.bought ? boughtOn(input.shelfId) : undefined,
    input.search.favourites
      ? and(eq(coffeeVerdict.wouldBuyAgain, true), gte(coffeeVerdict.rating, 4))
      : undefined,
    browsed,
  )
}

function sortedBy(column: LibrarySortBy, shelfId: string): SQL {
  const values: Record<LibrarySortBy, SQL> = {
    newest: sql`${coffee.createdAt}`,
    lastBought: latestOf(purchase.purchasedOn, shelfId),
    rating: sql`${coffeeVerdict.rating}`,
    communityRating: communityRatingColumns.average,
    roaster: sql`${roaster.nameKey}`,
    origin: originNamesSort,
    roastLevel: sql`${coffee.roastLevel}`,
    roastedFor: sql`${coffee.roastedFor}`,
    latestPrice: latestPriceOf(shelfId),
  }

  return values[column]
}

function libraryOrder(search: LibrarySearch, shelfId: string) {
  const picked = search.sort ? sortedBy(search.sort, shelfId) : null
  const lastBoughtFirst = search.bought
    ? [
        sql`${latestOf(purchase.purchasedOn, shelfId)} desc nulls last`,
        sql`${lastAddedOn(shelfId)} desc nulls last`,
      ]
    : []

  if (!picked) return lastBoughtFirst

  return [
    search.direction === 'ascending'
      ? sql`${picked} asc nulls last`
      : sql`${picked} desc nulls last`,
    ...lastBoughtFirst,
  ]
}

export async function listLibrary(
  db: Database,
  input: { shelfId: string; userId: string; search: LibrarySearch },
) {
  const { search } = input
  const browsed = await browseCoffees(db, search)

  const rows = await db
    .select({
      ...coffeeColumns,
      roasterId: coffee.roasterId,
      roastedOn: latestOf(purchase.roastedOn, input.shelfId),
      lastBought: latestOf(purchase.purchasedOn, input.shelfId),
      latestPriceCents: latestPriceOf(input.shelfId),
      rating: coffeeVerdict.rating,
      wouldBuyAgain: coffeeVerdict.wouldBuyAgain,
      communityRating: communityRatingColumns,
      onShelf: boughtOn(input.shelfId),
      total: browsedTotal,
    })
    .from(coffee)
    .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
    .leftJoin(coffeeVerdict, verdictOn(input.userId))
    .where(libraryWhere(input, browsed.where))
    .orderBy(
      ...libraryOrder(search, input.shelfId),
      desc(coffee.createdAt),
      asc(coffee.id),
    )
    .limit(search.pageSize)
    .offset(search.page * search.pageSize)

  return browsed.page(
    rows.map(row => ({
      ...row,
      rating: row.rating ?? null,
      wouldBuyAgain: row.wouldBuyAgain ?? false,
    })),
  )
}

export function listLibraryFilterOptions(
  db: Database,
  input: {
    shelfId: string
    kind: BrowsingFilterKind
    search: LibraryFilterSearch
  },
) {
  return browsingFilterOptions(db, {
    kind: input.kind,
    search: input.search,
    among: coffeesBoughtOn(db, input.shelfId),
  })
}
