import { defineEventHandler, getRouterParam } from 'h3'
import { findCoffeeCore } from '#server/utils/coffees'
import { useDb } from '#server/utils/db'
import { orNotFound, requireUser } from '#server/utils/session'

export default defineEventHandler(async event => {
  const user = await requireUser(event)
  const coffee = await findCoffeeCore(useDb(), {
    coffeeId: getRouterParam(event, 'coffeeId')!,
    viewer: user,
  })

  return orNotFound(coffee, 'Coffee not found')
})
