import {
  createError,
  defineEventHandler,
  getRequestURL,
  getRouterParam,
  sendNoContent,
} from 'h3'
import { useDb } from '#server/utils/db'
import { requireShelfOwner } from '#server/utils/session'
import { removeMember } from '#server/utils/shelves'
import { notifyShelf } from '#server/utils/notifications'

export default defineEventHandler(async event => {
  const { user, shelf } = await requireShelfOwner(event)
  const db = useDb()
  const userId = getRouterParam(event, 'userId')!
  const { outcome } = await removeMember(db, {
    shelfId: shelf.id,
    ownerId: user.id,
    userId,
  })

  if (outcome === 'owner') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Hand the shelf over or leave it instead',
    })
  }

  if (outcome === 'notMember') {
    throw createError({ statusCode: 404, statusMessage: 'Member not found' })
  }

  await notifyShelf(db, {
    shelfId: shelf.id,
    actorId: userId,
    kind: 'memberLeft',
    skip: user.id,
    origin: getRequestURL(event).origin,
  })

  return sendNoContent(event)
})
