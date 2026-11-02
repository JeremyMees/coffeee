import { defineEventHandler } from 'h3'
import { useDb } from '#server/utils/db'
import { deletePurchase } from '#server/utils/purchases'
import { orNotFound, requireShelfPurchase } from '#server/utils/session'

export default defineEventHandler(async event => {
  const ref = await requireShelfPurchase(event)

  return orNotFound(await deletePurchase(useDb(), ref), 'Purchase not found')
})
