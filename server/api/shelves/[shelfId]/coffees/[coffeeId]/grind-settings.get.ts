import { defineEventHandler, getRouterParam } from 'h3'
import { useDb } from '#server/utils/db'
import { findGrindSettings } from '#server/utils/grind-settings'
import { requireShelf } from '#server/utils/session'

export default defineEventHandler(async event => {
  const { user, shelf } = await requireShelf(event)

  return findGrindSettings(useDb(), {
    shelfId: shelf.id,
    userId: user.id,
    coffeeId: getRouterParam(event, 'coffeeId')!,
  })
})
