import { createError, defineEventHandler, sendNoContent } from 'h3'
import { useDb } from '#server/utils/db'
import { requireShelfOwner } from '#server/utils/session'
import { deleteShelf } from '#server/utils/shelves'

export default defineEventHandler(async event => {
  const { user, shelf } = await requireShelfOwner(event)
  const { outcome } = await deleteShelf(useDb(), {
    shelfId: shelf.id,
    userId: user.id,
  })

  if (outcome === 'lastShelf') {
    throw createError({
      statusCode: 409,
      statusMessage: "This is your only shelf, so you can't delete it",
    })
  }

  return sendNoContent(event)
})
