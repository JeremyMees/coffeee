import { defineEventHandler, getRequestURL, getRouterParam } from 'h3'
import { useDb } from '#server/utils/db'
import { finishPurchase } from '#server/utils/purchases'
import { orNotFound, requireShelf } from '#server/utils/session'

export default defineEventHandler(async event => {
  const { user, shelf } = await requireShelf(event)

  return orNotFound(
    await finishPurchase(useDb(), {
      shelfId: shelf.id,
      coffeeId: getRouterParam(event, 'coffeeId')!,
      purchaseId: getRouterParam(event, 'purchaseId')!,
      userId: user.id,
      origin: getRequestURL(event).origin,
    }),
    'Purchase not found',
  )
})
