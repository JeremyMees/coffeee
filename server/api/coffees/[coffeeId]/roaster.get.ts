import { defineEventHandler, getRouterParam } from 'h3'
import { findCoffeeRoaster } from '#server/utils/coffees'
import { useDb } from '#server/utils/db'
import { orNotFound, requireUser } from '#server/utils/session'

export default defineEventHandler(async event => {
  const user = await requireUser(event)
  const roaster = await findCoffeeRoaster(useDb(), {
    coffeeId: getRouterParam(event, 'coffeeId')!,
    viewer: user,
  })

  return orNotFound(roaster, 'Coffee not found')
})
