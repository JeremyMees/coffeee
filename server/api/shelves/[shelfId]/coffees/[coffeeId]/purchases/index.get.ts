import { defineEventHandler, getRouterParam } from 'h3'
import { useDb } from '#server/utils/db'
import { listShelfPurchases } from '#server/utils/purchases'
import { requireShelf } from '#server/utils/session'

export default defineEventHandler(async event => {
  const { shelf } = await requireShelf(event)

  return listShelfPurchases(useDb(), {
    shelfId: shelf.id,
    coffeeId: getRouterParam(event, 'coffeeId')!,
  })
})
