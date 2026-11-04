import { and, asc, desc, eq, gte, max, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { BrowsingFilterKind } from '#shared/types/browsing'
import type {
  LibraryColumn,
  LibraryFilterSearch,
  LibrarySearch,
} from '#shared/types/library'
import type { Database } from '#server/types/database'
import { coffee, coffeeVerdict, purchase, roaster } from '#server/db/schemas'
import {
  browseCoffees,
  browsedTotal,
  browsingFilterOptions,
  coffeesBoughtOn,
} from '#server/utils/browsing'
import { coffeeColumns } from '#server/utils/coffees'
import { originNamesSort } from '#server/utils/descriptions'
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

function libraryWhere(
  input: { shelfId: string; search: LibrarySearch },
  browsed: SQL | undefined,
) {
  return and(
    eq(purchase.shelfId, input.shelfId),
    input.search.favourites
      ? and(eq(coffeeVerdict.wouldBuyAgain, true), gte(coffeeVerdict.rating, 4))
      : undefined,
    browsed,
  )
}

function sortedBy(column: LibraryColumn, shelfId: string): SQL {
  const values: Record<LibraryColumn, SQL> = {
    rating: sql`${coffeeVerdict.rating}`,
    roaster: sql`${roaster.nameKey}`,
    origin: originNamesSort,
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
  const browsed = await browseCoffees(db, search)
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
      total: browsedTotal,
    })
    .from(purchase)
    .innerJoin(coffee, eq(coffee.id, purchase.coffeeId))
    .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
    .leftJoin(coffeeVerdict, verdictOn(input.userId))
    .where(libraryWhere(input, browsed.where))
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

  return browsed.page(
    rows.map(row => ({
      ...row,
      lastBought: row.lastBought!,
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
