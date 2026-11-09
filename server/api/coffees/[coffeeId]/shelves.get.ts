import { defineEventHandler, getRouterParam } from 'h3'
import { useDb } from '#server/utils/db'
import { requireUser } from '#server/utils/session'
import { shelvesHolding } from '#server/utils/shelves'

export default defineEventHandler(async event => {
  const user = await requireUser(event)

  return shelvesHolding(useDb(), {
    coffeeId: getRouterParam(event, 'coffeeId')!,
    userId: user.id,
  })
})
