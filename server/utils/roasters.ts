import { and, asc, eq, inArray, or, sql } from 'drizzle-orm'
import type { LibraryFilterSearch, LibraryOption } from '#shared/types/library'
import type { RoasterDetails, RoasterSearch } from '#shared/types/roasters'
import { nameKey } from '#shared/utils/names'
import type { Database } from '#server/types/database'
import type { Viewer } from '#server/types/coffees'
import type { EditableRoasterLogo } from '#server/types/photos'
import { coffee, origin, purchase, roaster } from '#server/db/schemas'
import { canEditCatalogEntry } from '#server/utils/catalog'
import { changeCatalog, findTakenName } from '#server/utils/catalog-entries'

export const roasterColumns = {
  id: roaster.id,
  name: roaster.name,
  website: roaster.website,
  countryCode: roaster.countryCode,
  city: roaster.city,
  logoUrl: roaster.logoUrl,
}

function boughtFrom(shelfId: string) {
  return sql`from ${purchase}
    inner join ${coffee} on ${coffee.id} = ${purchase.coffeeId}
    where ${purchase.shelfId} = ${shelfId}
      and ${coffee.roasterId} = ${roaster.id}`
}

function roasterSearch(search: string) {
  const key = nameKey(search)

  if (!key) return undefined

  return or(
    sql`strpos(${roaster.nameKey}, ${key}) > 0`,
    sql`strpos(lower(coalesce(${roaster.city}, '')), ${key}) > 0`,
    sql`strpos(lower(coalesce(${origin.name}, '')), ${key}) > 0`,
  )
}

export async function listRoasters(
  db: Database,
  input: { shelfId: string; search: RoasterSearch },
) {
  const { search } = input
  const bought = boughtFrom(input.shelfId)

  const rows = await db
    .select({
      ...roasterColumns,
      shelfCoffees: sql<number>`(select cast(count(distinct ${purchase.coffeeId}) as integer) ${bought})`,
      lastBought: sql<
        string | null
      >`(select max(${purchase.purchasedOn}) ${bought})`,
      total: sql<number>`cast(count(*) over () as integer)`,
    })
    .from(roaster)
    .leftJoin(origin, eq(origin.code, roaster.countryCode))
    .where(
      and(
        search.boughtFrom ? sql`exists (select 1 ${bought})` : undefined,
        search.countryCode.length
          ? inArray(roaster.countryCode, search.countryCode)
          : undefined,
        roasterSearch(search.search),
      ),
    )
    .orderBy(asc(roaster.nameKey), asc(roaster.id))
    .limit(search.pageSize)
    .offset(search.page * search.pageSize)

  return {
    total: rows[0]?.total ?? 0,
    roasters: rows.map(({ total: _total, ...row }) => row),
  }
}

export async function listRoasterCountries(
  db: Database,
  search: LibraryFilterSearch,
) {
  const key = nameKey(search.search)
  const rows = await db
    .selectDistinct({ value: origin.code, label: origin.name })
    .from(roaster)
    .innerJoin(origin, eq(origin.code, roaster.countryCode))
    .where(key ? sql`strpos(lower(${origin.name}), ${key}) > 0` : undefined)
    .orderBy(asc(origin.name), asc(origin.code))
    .limit(search.pageSize + 1)
    .offset(search.page * search.pageSize)

  return {
    options: rows.slice(0, search.pageSize) as LibraryOption[],
    hasMore: rows.length > search.pageSize,
  }
}

export async function findRoaster(
  db: Database,
  input: { roasterId: string; viewer: Viewer },
) {
  const [found] = await db
    .select({ ...roasterColumns, createdBy: roaster.createdBy })
    .from(roaster)
    .where(eq(roaster.id, input.roasterId))

  if (!found) return undefined

  const { createdBy, ...details } = found

  return { ...details, canEdit: canEditCatalogEntry(input.viewer, createdBy) }
}

export async function findEditableRoaster(
  db: Database,
  input: { roasterId: string; editor: Viewer },
) {
  const [current] = await db
    .select({ createdBy: roaster.createdBy, logoUrl: roaster.logoUrl })
    .from(roaster)
    .where(eq(roaster.id, input.roasterId))

  if (!current) return { outcome: 'notFound' as const }

  if (!canEditCatalogEntry(input.editor, current.createdBy)) {
    return { outcome: 'forbidden' as const }
  }

  return { outcome: 'editable' as const, logoUrl: current.logoUrl }
}

export function editRoaster(
  db: Database,
  input: { roasterId: string; editor: Viewer; details: RoasterDetails },
) {
  const { details } = input

  return db.transaction(async tx => {
    const current = await findEditableRoaster(tx, input)

    if (current.outcome !== 'editable') return current

    const taken = await findTakenName(tx, roaster, {
      name: details.name,
      except: input.roasterId,
    })

    if (taken) return { outcome: 'taken' as const, taken }

    const [edited] = await tx
      .update(roaster)
      .set({
        name: details.name,
        nameKey: nameKey(details.name),
        website: details.website,
        countryCode: details.countryCode,
        city: details.city,
      })
      .where(eq(roaster.id, input.roasterId))
      .returning(roasterColumns)

    return { outcome: 'edited' as const, roaster: edited! }
  })
}

export function replaceRoasterLogo(
  db: Database,
  current: EditableRoasterLogo,
  logoUrl: string | null,
) {
  return changeCatalog(db, async (tx, dropPhoto) => {
    await tx
      .update(roaster)
      .set({ logoUrl })
      .where(eq(roaster.id, current.roasterId))
    dropPhoto(current.logoUrl)

    return { logoUrl }
  })
}
