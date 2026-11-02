import { defineEventHandler, getRouterParam } from 'h3'
import { useDb } from '#server/utils/db'
import { disownGrinder } from '#server/utils/grinders'
import { orNotFound, requireShelf } from '#server/utils/session'

export default defineEventHandler(async event => {
  const { shelf } = await requireShelf(event)

  return orNotFound(
    await disownGrinder(useDb(), {
      shelfId: shelf.id,
      grinderId: getRouterParam(event, 'grinderId')!,
    }),
    'This shelf does not own that grinder',
  )
})
