import {
  defineEventHandler,
  getRequestURL,
  getRouterParam,
  setResponseStatus,
} from 'h3'
import { purchaseSchema } from '#shared/utils/schemas'
import { useDb } from '#server/utils/db'
import { buyAgain } from '#server/utils/purchases'
import { orNotFound, requireShelf } from '#server/utils/session'
import { readValidBody } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const { user, shelf } = await requireShelf(event)
  const purchase = await readValidBody(event, purchaseSchema)
  const added = orNotFound(
    await buyAgain(useDb(), {
      shelfId: shelf.id,
      coffeeId: getRouterParam(event, 'coffeeId')!,
      userId: user.id,
      purchase,
      origin: getRequestURL(event).origin,
    }),
    'Coffee not found',
  )
  setResponseStatus(event, 201)

  return added
})
