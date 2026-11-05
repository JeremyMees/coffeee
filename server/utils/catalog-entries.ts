import { and, eq, ne, sql } from 'drizzle-orm'
import type { RoasterDetails } from '#shared/types/roasters'
import { nameKey } from '#shared/utils/names'
import type {
  CatalogCoffee,
  DropPhoto,
  NameScope,
} from '#server/types/catalog-entries'
import type { Database } from '#server/types/database'
import type { SharedList } from '#server/types/lists'
import { coffee, roaster } from '#server/db/schemas'
import { coffeeColumns } from '#server/utils/coffees'
import { describeCoffee } from '#server/utils/descriptions'
import { withFreshId } from '#server/utils/ids'
import { deletePhoto } from '#server/utils/photos'

export async function changeCatalog<Changed>(
  db: Database,
  change: (tx: Database, dropPhoto: DropPhoto) => Promise<Changed>,
) {
  const dropped: string[] = []
  const changed = await db.transaction(tx =>
    change(tx, url => {
      if (url) dropped.push(url)
    }),
  )

  for (const url of dropped) await deletePhoto(url)

  return changed
}

export async function findTakenName(
  db: Database,
  list: SharedList,
  input: { name: string; except: string; scope?: NameScope },
) {
  const { scope } = input
  const [taken] = await db
    .select({ name: sql<string>`${list.name}` })
    .from(list)
    .where(
      and(
        eq(list.nameKey, nameKey(input.name)),
        ne(list.id, input.except),
        scope ? eq(scope.column, scope.value) : undefined,
      ),
    )

  return taken
}

export async function findOrCreateRoaster(
  db: Database,
  input: Partial<RoasterDetails> & { name: string; createdBy: string },
) {
  const key = nameKey(input.name)
  const columns = { id: roaster.id, name: roaster.name }
  const [created] = await withFreshId(db, (db, id) =>
    db
      .insert(roaster)
      .values({ ...input, id, nameKey: key })
      .onConflictDoNothing({ target: roaster.nameKey })
      .returning(columns),
  )

  if (created) return { roaster: created, created: true }

  const [found] = await db
    .select(columns)
    .from(roaster)
    .where(eq(roaster.nameKey, key))

  return { roaster: found!, created: false }
}

async function findOrCreateCoffee(
  db: Database,
  input: Omit<typeof coffee.$inferInsert, 'nameKey'>,
) {
  const key = nameKey(input.name)

  const [created] = await withFreshId(db, (db, id) =>
    db
      .insert(coffee)
      .values({ ...input, id, nameKey: key })
      .onConflictDoNothing({ target: [coffee.roasterId, coffee.nameKey] })
      .returning({ id: coffee.id }),
  )

  const [found] = await db
    .select(coffeeColumns)
    .from(coffee)
    .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
    .where(and(eq(coffee.roasterId, input.roasterId), eq(coffee.nameKey, key)))

  return { coffee: found!, created: created !== undefined }
}

export async function addCatalogCoffee(
  db: Database,
  input: {
    userId: string
    details: CatalogCoffee
    whenFound: 'keep' | 'update'
  },
) {
  const { details, userId } = input
  const stored = {
    roastLevel: details.roastLevel,
    roastedFor: details.roastedFor,
    altitudeFrom: details.altitudeFrom,
    altitudeTo: details.altitudeTo,
    link: details.link,
  }
  const { roaster: found } = await findOrCreateRoaster(db, {
    name: details.roaster,
    createdBy: userId,
  })
  const added = await findOrCreateCoffee(db, {
    roasterId: found.id,
    name: details.name,
    createdBy: userId,
    ...stored,
  })

  if (!added.created && input.whenFound === 'keep') return added

  if (!added.created) {
    await db.update(coffee).set(stored).where(eq(coffee.id, added.coffee.id))
  }

  await describeCoffee(db, {
    coffeeId: added.coffee.id,
    userId,
    description: details,
  })

  return added
}
