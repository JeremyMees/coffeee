import { and, asc, desc, eq, sql } from 'drizzle-orm'
import type { BrowsingFilterKind } from '#shared/types/browsing'
import type { CatalogSearch } from '#shared/types/catalog'
import type { LibraryFilterSearch } from '#shared/types/library'
import type { Database } from '#server/types/database'
import type { Viewer } from '#server/types/coffees'
import { coffee, purchase, roaster } from '#server/db/schemas'
import {
  boughtOn,
  browseCoffees,
  browsedTotal,
  browsingFilterOptions,
} from '#server/utils/browsing'
import { coffeeColumns } from '#server/utils/coffees'
import {
  byCommunityRating,
  communityRatingColumns,
} from '#server/utils/verdicts'

export function canEditCatalogEntry(viewer: Viewer, createdBy: string | null) {
  return viewer.role === 'admin' || viewer.id === createdBy
}

function latestRoastOn(shelfId: string) {
  return sql<string | null>`(
    select max(${purchase.roastedOn}) from ${purchase}
    where ${purchase.shelfId} = ${shelfId}
      and ${purchase.coffeeId} = ${coffee.id}
  )`
}

export async function listCatalog(
  db: Database,
  input: { shelfId: string; search: CatalogSearch },
) {
  const { search } = input
  const browsed = await browseCoffees(db, search)

  const rows = await db
    .select({
      ...coffeeColumns,
      roasterId: coffee.roasterId,
      roastedOn: latestRoastOn(input.shelfId),
      communityRating: communityRatingColumns,
      onShelf: boughtOn(input.shelfId),
      total: browsedTotal,
    })
    .from(coffee)
    .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
    .where(
      and(browsed.where, search.mine ? boughtOn(input.shelfId) : undefined),
    )
    .orderBy(
      ...(search.sort === 'communityRating' ? byCommunityRating() : []),
      desc(coffee.createdAt),
      asc(coffee.id),
    )
    .limit(search.pageSize)
    .offset(search.page * search.pageSize)

  return browsed.page(rows)
}

export function listCatalogFilterOptions(
  db: Database,
  input: { kind: BrowsingFilterKind; search: LibraryFilterSearch },
) {
  return browsingFilterOptions(db, input)
}
