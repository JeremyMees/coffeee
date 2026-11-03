import { defineEventHandler, getRequestURL, getRouterParam } from 'h3'
import { useDb } from '#server/utils/db'
import { notifyShelf } from '#server/utils/notifications'
import { finishPurchase, isPurchaseOpen } from '#server/utils/purchases'
import { orNotFound, requireShelf } from '#server/utils/session'

export default defineEventHandler(async event => {
  const { user, shelf } = await requireShelf(event)
  const db = useDb()
  const ref = {
    shelfId: shelf.id,
    coffeeId: getRouterParam(event, 'coffeeId')!,
    purchaseId: getRouterParam(event, 'purchaseId')!,
  }
  const wasOpen = await isPurchaseOpen(db, ref)
  const finished = orNotFound(
    await finishPurchase(db, ref),
    'Purchase not found',
  )

  if (wasOpen) {
    await notifyShelf(db, {
      shelfId: shelf.id,
      actorId: user.id,
      kind: 'bagFinished',
      coffeeId: ref.coffeeId,
      origin: getRequestURL(event).origin,
    })
  }

  return finished
})
