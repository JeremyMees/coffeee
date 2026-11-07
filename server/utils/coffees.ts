import { and, desc, eq, isNull, max, sql } from 'drizzle-orm'
import type { CoffeeDetails, NewCoffee } from '#shared/types/coffee'
import { nameKey } from '#shared/utils/names'
import type { Database } from '#server/types/database'
import { coffee, coffeeVerdict, purchase, roaster } from '#server/db/schemas'
import type { Viewer } from '#server/types/coffees'
import { canEditCatalogEntry } from '#server/utils/catalog'
import type { EditableCoffeePhoto } from '#server/types/photos'
import {
  addCatalogCoffee,
  changeCatalog,
  findOrCreateRoaster,
  findTakenName,
} from '#server/utils/catalog-entries'
import {
  cardDescriptionsOf,
  describeCoffee,
  descriptionOf,
} from '#server/utils/descriptions'
import { changeShelf } from '#server/utils/notifications'
import { addPurchase } from '#server/utils/purchases'
import { findRoaster } from '#server/utils/roasters'
import { shelvesHolding } from '#server/utils/shelves'
import {
  communityRatingOf,
  findVerdict,
  reviewsOf,
  verdictOn,
} from '#server/utils/verdicts'

export const coffeeColumns = {
  id: coffee.id,
  name: coffee.name,
  roaster: roaster.name,
  roastLevel: coffee.roastLevel,
  roastedFor: coffee.roastedFor,
  photoUrl: coffee.photoUrl,
}

const detailColumns = {
  ...coffeeColumns,
  altitudeFrom: coffee.altitudeFrom,
  altitudeTo: coffee.altitudeTo,
  link: coffee.link,
}

export function addCoffee(
  db: Database,
  input: { shelfId: string; userId: string; coffee: NewCoffee; origin: string },
) {
  const details = input.coffee

  return changeShelf(db, input.origin, async (tx, notify) => {
    const { coffee: found } = await addCatalogCoffee(tx, {
      userId: input.userId,
      details,
      whenFound: 'keep',
    })
    const added = await addPurchase(tx, {
      shelfId: input.shelfId,
      coffeeId: found.id,
      userId: input.userId,
      purchase: details,
    })
    await notify({
      shelfId: input.shelfId,
      actorId: input.userId,
      kind: 'coffeeAdded',
      coffeeId: found.id,
    })

    return { coffee: found, purchase: { id: added.id } }
  })
}

export async function listStock(
  db: Database,
  input: { shelfId: string; userId: string },
) {
  const stock = await db
    .select({
      ...coffeeColumns,
      roastedOn: max(purchase.roastedOn),
      rating: coffeeVerdict.rating,
    })
    .from(purchase)
    .innerJoin(coffee, eq(coffee.id, purchase.coffeeId))
    .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
    .leftJoin(coffeeVerdict, verdictOn(input.userId))
    .where(
      and(eq(purchase.shelfId, input.shelfId), isNull(purchase.finishedAt)),
    )
    .groupBy(coffee.id, roaster.id, coffeeVerdict.rating)
    .orderBy(desc(max(purchase.purchasedOn)), desc(max(purchase.createdAt)))
  const cards = await cardDescriptionsOf(
    db,
    stock.map(row => row.id),
  )

  return stock.map(row => ({
    ...row,
    flavorNotes: cards.get(row.id)!.flavorNotes,
  }))
}

export async function findEditableCoffee(
  db: Database,
  input: { coffeeId: string; editor: Viewer },
) {
  const [current] = await db
    .select({ createdBy: coffee.createdBy, photoUrl: coffee.photoUrl })
    .from(coffee)
    .where(eq(coffee.id, input.coffeeId))

  if (!current) return { outcome: 'notFound' as const }

  if (!canEditCatalogEntry(input.editor, current.createdBy)) {
    return { outcome: 'forbidden' as const }
  }

  return { outcome: 'editable' as const, photoUrl: current.photoUrl }
}

export function replaceCoffeePhoto(
  db: Database,
  current: EditableCoffeePhoto,
  photoUrl: string | null,
) {
  return changeCatalog(db, async (tx, dropPhoto) => {
    await tx
      .update(coffee)
      .set({ photoUrl })
      .where(eq(coffee.id, current.coffeeId))
    dropPhoto(current.photoUrl)

    return { photoUrl }
  })
}

export async function findCoffeeCore(
  db: Database,
  input: { coffeeId: string; viewer: Viewer },
) {
  const [found] = await db
    .select({
      ...detailColumns,
      roasterId: coffee.roasterId,
      createdBy: coffee.createdBy,
    })
    .from(coffee)
    .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
    .where(eq(coffee.id, input.coffeeId))

  if (!found) return undefined

  const { createdBy, ...details } = found
  const [description, deletable] = await Promise.all([
    descriptionOf(db, input.coffeeId),
    findDeletableCoffee(db, {
      coffeeId: input.coffeeId,
      deleter: input.viewer,
    }),
  ])

  return {
    ...details,
    ...description,
    canEdit: canEditCatalogEntry(input.viewer, createdBy),
    canDelete: deletable.outcome === 'deletable',
  }
}

export async function findCoffeeRoaster(
  db: Database,
  input: { coffeeId: string; viewer: Viewer },
) {
  const [found] = await db
    .select({ roasterId: coffee.roasterId })
    .from(coffee)
    .where(eq(coffee.id, input.coffeeId))

  if (!found) return undefined

  return findRoaster(db, { roasterId: found.roasterId, viewer: input.viewer })
}

export async function findCoffeeReviews(
  db: Database,
  input: { coffeeId: string; viewer: Viewer },
) {
  const [communityRating, reviews] = await Promise.all([
    communityRatingOf(db, input.coffeeId),
    reviewsOf(db, { coffeeId: input.coffeeId, userId: input.viewer.id }),
  ])

  return { communityRating, reviews }
}

export async function findCoffee(
  db: Database,
  input: { coffeeId: string; viewer: Viewer },
) {
  const core = await findCoffeeCore(db, input)

  if (!core) return undefined

  const { roasterId, ...details } = core
  const [verdict, reviews, roasterDetails, shelves] = await Promise.all([
    findVerdict(db, { userId: input.viewer.id, coffeeId: input.coffeeId }),
    findCoffeeReviews(db, input),
    findRoaster(db, { roasterId, viewer: input.viewer }),
    shelvesHolding(db, { coffeeId: input.coffeeId, userId: input.viewer.id }),
  ])

  return {
    ...details,
    ...verdict,
    ...reviews,
    roasterDetails: roasterDetails!,
    shelves,
  }
}

export function editCoffee(
  db: Database,
  input: { coffeeId: string; editor: Viewer; details: CoffeeDetails },
) {
  const { details } = input

  return db.transaction(async tx => {
    const current = await findEditableCoffee(tx, input)

    if (current.outcome !== 'editable') return current

    const { roaster: kept } = await findOrCreateRoaster(tx, {
      name: details.roaster,
      createdBy: input.editor.id,
    })
    const roasterId = kept.id
    const taken = await findTakenName(tx, coffee, {
      name: details.name,
      except: input.coffeeId,
      scope: { column: coffee.roasterId, value: roasterId },
    })

    if (taken) {
      return {
        outcome: 'taken' as const,
        taken: { roaster: kept.name, name: taken.name },
      }
    }

    await tx
      .update(coffee)
      .set({
        roasterId,
        name: details.name,
        nameKey: nameKey(details.name),
        roastLevel: details.roastLevel,
        roastedFor: details.roastedFor,
        altitudeFrom: details.altitudeFrom,
        altitudeTo: details.altitudeTo,
        link: details.link,
      })
      .where(eq(coffee.id, input.coffeeId))

    await describeCoffee(tx, {
      coffeeId: input.coffeeId,
      userId: input.editor.id,
      description: details,
    })

    const [edited] = await tx
      .select(detailColumns)
      .from(coffee)
      .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
      .where(eq(coffee.id, input.coffeeId))

    return {
      outcome: 'edited' as const,
      coffee: { ...edited!, ...(await descriptionOf(tx, input.coffeeId)) },
    }
  })
}

export async function findDeletableCoffee(
  db: Database,
  input: { coffeeId: string; deleter: Viewer },
) {
  const [current] = await db
    .select({ createdBy: coffee.createdBy, photoUrl: coffee.photoUrl })
    .from(coffee)
    .where(eq(coffee.id, input.coffeeId))

  if (!current) return { outcome: 'notFound' as const }

  const deletable = {
    outcome: 'deletable' as const,
    photoUrl: current.photoUrl,
  }

  if (input.deleter.role === 'admin') return deletable

  if (current.createdBy !== input.deleter.id) {
    return { outcome: 'forbidden' as const }
  }

  const [boughtByOthers] = await db
    .select({ id: purchase.id })
    .from(purchase)
    .where(
      and(
        eq(purchase.coffeeId, input.coffeeId),
        sql`${purchase.addedBy} is distinct from ${input.deleter.id}`,
      ),
    )
    .limit(1)

  if (boughtByOthers) return { outcome: 'boughtByOthers' as const }

  return deletable
}

export async function removeCoffee(db: Database, coffeeId: string) {
  await db.delete(purchase).where(eq(purchase.coffeeId, coffeeId))
  await db.delete(coffee).where(eq(coffee.id, coffeeId))
}

export function deleteCoffee(
  db: Database,
  input: { coffeeId: string; deleter: Viewer },
) {
  return changeCatalog(db, async (tx, dropPhoto) => {
    const current = await findDeletableCoffee(tx, input)

    if (current.outcome !== 'deletable') return current

    await removeCoffee(tx, input.coffeeId)
    dropPhoto(current.photoUrl)

    return { outcome: 'deleted' as const }
  })
}
