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
import { coffee, coffeeVerdict, purchase, roaster } from '#server/db/schemas'
import { coffeeColumns } from '#server/utils/coffees'
import {
  cardDescriptionsOf,
  describedWith,
  descriptionFilterOptions,
  originNamesSort,
} from '#server/utils/descriptions'
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

function libraryWhere(input: { shelfId: string; search: LibrarySearch }) {
  const { search } = input

  return and(
    eq(purchase.shelfId, input.shelfId),
    search.favourites
      ? and(eq(coffeeVerdict.wouldBuyAgain, true), gte(coffeeVerdict.rating, 4))
      : undefined,
    search.roasterId ? eq(coffee.roasterId, search.roasterId) : undefined,
    search.flavorNoteId
      ? describedWith('flavorNotes', search.flavorNoteId)
      : undefined,
    search.originCode ? describedWith('origins', search.originCode) : undefined,
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
  const cards = await cardDescriptionsOf(db, coffeeIds)

  return {
    total: rows[0]?.total ?? 0,
    coffees: rows.map(({ total: _total, ...row }) => ({
      ...row,
      lastBought: row.lastBought!,
      wouldBuyAgain: row.wouldBuyAgain ?? false,
      ...cards.get(row.id)!,
    })),
  }
}

function roasterOptions(db: Database, input: { shelfId: string; key: string }) {
  return db
    .selectDistinct({
      value: roaster.id,
      label: roaster.name,
      key: roaster.nameKey,
    })
    .from(purchase)
    .innerJoin(coffee, eq(coffee.id, purchase.coffeeId))
    .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
    .where(
      and(
        eq(purchase.shelfId, input.shelfId),
        sql`strpos(${roaster.nameKey}, ${input.key}) > 0`,
      ),
    )
    .orderBy(asc(roaster.nameKey), asc(roaster.id))
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
  const limit = search.pageSize + 1
  const offset = search.page * search.pageSize
  const rows =
    input.kind === 'roasters'
      ? await roasterOptions(db, {
          shelfId: input.shelfId,
          key: nameKey(search.search),
        })
          .limit(limit)
          .offset(offset)
      : await descriptionFilterOptions(
          db,
          input.kind === 'flavor-notes' ? 'flavorNotes' : 'origins',
          {
            search: search.search,
            limit,
            offset,
            among: db
              .select({ coffeeId: purchase.coffeeId })
              .from(purchase)
              .where(eq(purchase.shelfId, input.shelfId)),
          },
        )

  return {
    options: rows
      .slice(0, search.pageSize)
      .map(({ value, label }): LibraryOption => ({ value, label })),
    hasMore: rows.length > search.pageSize,
  }
}
