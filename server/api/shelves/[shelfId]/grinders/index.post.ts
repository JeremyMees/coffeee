import { defineEventHandler, setResponseStatus } from 'h3'
import { newGrinderSchema } from '#shared/utils/schemas'
import { useDb } from '#server/utils/db'
import { ownGrinder } from '#server/utils/grinders'
import { requireShelf } from '#server/utils/session'
import { readValidBody } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const { user, shelf } = await requireShelf(event)
  const grinder = await readValidBody(event, newGrinderSchema)

  const owned = await ownGrinder(useDb(), {
    shelfId: shelf.id,
    userId: user.id,
    grinder,
  })
  setResponseStatus(event, 201)

  return owned
})
