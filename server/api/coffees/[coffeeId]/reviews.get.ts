import { defineEventHandler, getRouterParam } from 'h3'
import { findCoffeeReviews } from '#server/utils/coffees'
import { useDb } from '#server/utils/db'
import { requireUser } from '#server/utils/session'

export default defineEventHandler(async event => {
  const user = await requireUser(event)

  return findCoffeeReviews(useDb(), {
    coffeeId: getRouterParam(event, 'coffeeId')!,
    viewer: user,
  })
})
