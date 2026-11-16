import { and, asc, desc, eq } from 'drizzle-orm'
import type { BrowsingFilterKind } from '#shared/types/browsing'
import type { CatalogSearch } from '#shared/types/catalog'
import type { LibraryFilterSearch } from '#shared/types/library'
import type { Database } from '#server/types/database'
import type { Viewer } from '#server/types/coffees'
import { coffee, coffeeVerdict, roaster } from '#server/db/schemas'
import {
  boughtOn,
  browseCoffees,
  browsedTotal,
  browsingFilterOptions,
} from '#server/utils/browsing'
import { coffeeColumns } from '#server/utils/coffees'
import { latestRoastColumns } from '#server/utils/purchases'
import {
  byCommunityRating,
  communityRatingColumns,
  verdictOn,
} from '#server/utils/verdicts'

export function canEditCatalogEntry(viewer: Viewer, createdBy: string | null) {
  return viewer.role === 'admin' || viewer.id === createdBy
}

export async function listCatalog(
  db: Database,
  input: { shelfId: string; userId: string; search: CatalogSearch },
) {
  const { search } = input
  const browsed = await browseCoffees(db, search)

  const rows = await db
    .select({
      ...coffeeColumns,
      roasterId: coffee.roasterId,
      ...latestRoastColumns({ shelfId: input.shelfId }),
      rating: coffeeVerdict.rating,
      communityRating: communityRatingColumns,
      onShelf: boughtOn(input.shelfId),
      total: browsedTotal,
    })
    .from(coffee)
    .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
    .leftJoin(coffeeVerdict, verdictOn(input.userId))
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

  return browsed.page(rows.map(row => ({ ...row, rating: row.rating ?? null })))
}

export function listCatalogFilterOptions(
  db: Database,
  input: { kind: BrowsingFilterKind; search: LibraryFilterSearch },
) {
  return browsingFilterOptions(db, input)
}
