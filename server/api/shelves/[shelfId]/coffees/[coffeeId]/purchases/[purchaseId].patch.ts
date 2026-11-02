import { defineEventHandler } from 'h3'
import { purchaseSchema } from '#shared/utils/schemas'
import { useDb } from '#server/utils/db'
import { editPurchase } from '#server/utils/purchases'
import { orNotFound, requireShelfPurchase } from '#server/utils/session'
import { readValidBody } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const ref = await requireShelfPurchase(event)
  const purchase = await readValidBody(event, purchaseSchema)

  return orNotFound(
    await editPurchase(useDb(), { ...ref, purchase }),
    'Purchase not found',
  )
})
