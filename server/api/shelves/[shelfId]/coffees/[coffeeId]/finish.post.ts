import {
  createError,
  defineEventHandler,
  getRequestURL,
  getRouterParam,
} from 'h3'
import { useDb } from '#server/utils/db'
import { notifyShelf } from '#server/utils/notifications'
import { finishCoffee } from '#server/utils/purchases'
import { requireShelf } from '#server/utils/session'

export default defineEventHandler(async event => {
  const { user, shelf } = await requireShelf(event)
  const db = useDb()
  const coffeeId = getRouterParam(event, 'coffeeId')!
  const finished = await finishCoffee(db, { shelfId: shelf.id, coffeeId })

  if (!finished) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Nothing of this coffee is in stock',
    })
  }

  await notifyShelf(db, {
    shelfId: shelf.id,
    actorId: user.id,
    kind: 'bagFinished',
    coffeeId,
    origin: getRequestURL(event).origin,
  })

  return finished
})
