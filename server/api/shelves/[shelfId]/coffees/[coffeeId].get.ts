import { createError, defineEventHandler, getRouterParam } from 'h3'
import { findShelfCoffee } from '#server/utils/coffees'
import { useDb } from '#server/utils/db'
import { requireShelf } from '#server/utils/session'

export default defineEventHandler(async event => {
  const { user, shelf } = await requireShelf(event)
  const coffee = await findShelfCoffee(useDb(), {
    shelfId: shelf.id,
    coffeeId: getRouterParam(event, 'coffeeId')!,
    viewer: user,
  })

  if (!coffee) {
    throw createError({ statusCode: 404, statusMessage: 'Coffee not found' })
  }

  return coffee
})
