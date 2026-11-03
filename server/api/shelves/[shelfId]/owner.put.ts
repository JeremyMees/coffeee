import { createError, defineEventHandler } from 'h3'
import { shelfHandOverSchema } from '#shared/utils/schemas'
import { useDb } from '#server/utils/db'
import { requireShelfOwner } from '#server/utils/session'
import { handOverShelf } from '#server/utils/shelves'
import { readValidBody } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const { shelf } = await requireShelfOwner(event)
  const { ownerId } = await readValidBody(event, shelfHandOverSchema)
  const handed = await handOverShelf(useDb(), { shelfId: shelf.id, ownerId })

  if (handed.outcome === 'notMember') {
    throw createError({
      statusCode: 422,
      statusMessage: 'Only a member of this shelf can take it over',
    })
  }

  return handed.shelf
})
