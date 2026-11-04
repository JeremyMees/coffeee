import {
  createError,
  defineEventHandler,
  getRequestURL,
  getRouterParam,
} from 'h3'
import { useDb } from '#server/utils/db'
import { finishCoffee } from '#server/utils/purchases'
import { requireShelf } from '#server/utils/session'

export default defineEventHandler(async event => {
  const { user, shelf } = await requireShelf(event)
  const finished = await finishCoffee(useDb(), {
    shelfId: shelf.id,
    coffeeId: getRouterParam(event, 'coffeeId')!,
    userId: user.id,
    origin: getRequestURL(event).origin,
  })

  if (!finished) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Nothing of this coffee is in stock',
    })
  }

  return finished
})
