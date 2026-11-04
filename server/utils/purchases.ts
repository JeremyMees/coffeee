import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import type { NewPurchase } from '#shared/types/purchases'
import { priceCents } from '#shared/utils/purchases'
import type { Database } from '#server/types/database'
import type { ShelfPurchaseRef } from '#server/types/purchases'
import { coffee, purchase } from '#server/db/schemas'
import type { NotifyShelf } from '#server/utils/notifications'
import { changeShelf } from '#server/utils/notifications'

export const purchaseColumns = {
  id: purchase.id,
  purchasedOn: purchase.purchasedOn,
  roastedOn: purchase.roastedOn,
  sizeGrams: purchase.sizeGrams,
  priceCents: purchase.priceCents,
  finishedAt: purchase.finishedAt,
}

function purchaseValues(details: NewPurchase) {
  return {
    purchasedOn: details.purchasedOn,
    roastedOn: details.roastedOn ?? null,
    sizeGrams: details.sizeGrams ?? null,
    priceCents: priceCents(details.price ?? null),
  }
}

function onShelf(ref: ShelfPurchaseRef) {
  return and(
    eq(purchase.id, ref.purchaseId),
    eq(purchase.shelfId, ref.shelfId),
    eq(purchase.coffeeId, ref.coffeeId),
  )
}

export async function addPurchase(
  db: Database,
  input: {
    shelfId: string
    coffeeId: string
    userId: string
    purchase: NewPurchase
  },
) {
  const [added] = await db
    .insert(purchase)
    .values({
      shelfId: input.shelfId,
      coffeeId: input.coffeeId,
      addedBy: input.userId,
      ...purchaseValues(input.purchase),
    })
    .returning(purchaseColumns)

  return added!
}

export function buyAgain(
  db: Database,
  input: Parameters<typeof addPurchase>[1] & { origin: string },
) {
  return changeShelf(db, input.origin, async (tx, notify) => {
    const [found] = await tx
      .select({ id: coffee.id })
      .from(coffee)
      .where(eq(coffee.id, input.coffeeId))

    if (!found) return undefined

    const added = await addPurchase(tx, input)
    await notify({
      shelfId: input.shelfId,
      actorId: input.userId,
      kind: 'purchaseAdded',
      coffeeId: input.coffeeId,
    })

    return added
  })
}

async function finishOpenPurchase(
  db: Database,
  notify: NotifyShelf,
  input: ShelfPurchaseRef & { userId: string },
) {
  const [finished] = await db
    .update(purchase)
    .set({ finishedAt: sql`now()` })
    .where(and(onShelf(input), isNull(purchase.finishedAt)))
    .returning(purchaseColumns)

  if (finished) {
    await notify({
      shelfId: input.shelfId,
      actorId: input.userId,
      kind: 'bagFinished',
      coffeeId: input.coffeeId,
    })
  }

  return finished
}

export function finishCoffee(
  db: Database,
  input: { shelfId: string; coffeeId: string; userId: string; origin: string },
) {
  return changeShelf(db, input.origin, async (tx, notify) => {
    const [oldest] = await tx
      .select({ id: purchase.id })
      .from(purchase)
      .where(
        and(
          eq(purchase.shelfId, input.shelfId),
          eq(purchase.coffeeId, input.coffeeId),
          isNull(purchase.finishedAt),
        ),
      )
      .orderBy(asc(purchase.purchasedOn), asc(purchase.createdAt))
      .limit(1)

    if (!oldest) return undefined

    return finishOpenPurchase(tx, notify, { ...input, purchaseId: oldest.id })
  })
}

export async function editPurchase(
  db: Database,
  input: ShelfPurchaseRef & { purchase: NewPurchase },
) {
  const [edited] = await db
    .update(purchase)
    .set(purchaseValues(input.purchase))
    .where(onShelf(input))
    .returning(purchaseColumns)

  return edited
}

export function finishPurchase(
  db: Database,
  input: ShelfPurchaseRef & { userId: string; origin: string },
) {
  return changeShelf(db, input.origin, async (tx, notify) => {
    const finished = await finishOpenPurchase(tx, notify, input)

    if (finished) return finished

    const [found] = await tx
      .select(purchaseColumns)
      .from(purchase)
      .where(onShelf(input))

    return found
  })
}

export async function deletePurchase(db: Database, ref: ShelfPurchaseRef) {
  const [deleted] = await db
    .delete(purchase)
    .where(onShelf(ref))
    .returning({ id: purchase.id })

  return deleted
}
