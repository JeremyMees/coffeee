import { createError, defineEventHandler, getRouterParam } from 'h3'
import { findShelfCoffee } from '../../../../utils/coffees'
import { useDb } from '../../../../utils/db'
import { requireShelf } from '../../../../utils/session'

export default defineEventHandler(async event => {
  const { shelf } = await requireShelf(event)
  const coffee = await findShelfCoffee(useDb(), {
    shelfId: shelf.id,
    coffeeId: getRouterParam(event, 'coffeeId')!,
  })

  if (!coffee) {
    throw createError({ statusCode: 404, statusMessage: 'Coffee not found' })
  }

  return coffee
})
