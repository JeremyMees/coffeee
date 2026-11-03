import {
  defineEventHandler,
  getRequestURL,
  getRouterParam,
  setResponseStatus,
} from 'h3'
import { purchaseSchema } from '#shared/utils/schemas'
import { useDb } from '#server/utils/db'
import { notifyShelf } from '#server/utils/notifications'
import { buyAgain } from '#server/utils/purchases'
import { orNotFound, requireShelf } from '#server/utils/session'
import { readValidBody } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const { user, shelf } = await requireShelf(event)
  const purchase = await readValidBody(event, purchaseSchema)
  const db = useDb()
  const coffeeId = getRouterParam(event, 'coffeeId')!
  const added = orNotFound(
    await buyAgain(db, {
      shelfId: shelf.id,
      coffeeId,
      userId: user.id,
      purchase,
    }),
    'Coffee not found',
  )
  await notifyShelf(db, {
    shelfId: shelf.id,
    actorId: user.id,
    kind: 'purchaseAdded',
    coffeeId,
    origin: getRequestURL(event).origin,
  })
  setResponseStatus(event, 201)

  return added
})
