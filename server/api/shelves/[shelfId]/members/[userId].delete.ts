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

export default defineEventHandler(async event => {
  const { user, shelf } = await requireShelfOwner(event)
  const { outcome } = await removeMember(useDb(), {
    shelfId: shelf.id,
    ownerId: user.id,
    userId: getRouterParam(event, 'userId')!,
    origin: getRequestURL(event).origin,
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

  return sendNoContent(event)
})
