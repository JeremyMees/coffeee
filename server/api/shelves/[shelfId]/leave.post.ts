import { createError, defineEventHandler, sendNoContent } from 'h3'
import { useDb } from '#server/utils/db'
import { requireShelf } from '#server/utils/session'
import { leaveShelf } from '#server/utils/shelves'
import { notifyShelf } from '#server/utils/notifications'

export default defineEventHandler(async event => {
  const { user, shelf } = await requireShelf(event)
  const db = useDb()
  const { outcome } = await leaveShelf(db, {
    shelfId: shelf.id,
    ownerId: shelf.ownerId,
    userId: user.id,
  })

  if (outcome === 'lastShelf') {
    throw createError({
      statusCode: 409,
      statusMessage: "This is your only shelf, so you can't leave it",
    })
  }

  if (outcome === 'handOverFirst') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Hand the shelf to another member before you leave',
    })
  }

  if (outcome === 'left') {
    await notifyShelf(db, {
      shelfId: shelf.id,
      actorId: user.id,
      kind: 'memberLeft',
    })
  }

  return sendNoContent(event)
})
