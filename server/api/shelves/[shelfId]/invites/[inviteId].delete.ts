import {
  createError,
  defineEventHandler,
  getRouterParam,
  sendNoContent,
} from 'h3'
import { useDb } from '#server/utils/db'
import { cancelShelfInvite } from '#server/utils/invites'
import { requireShelf } from '#server/utils/session'

export default defineEventHandler(async event => {
  const { shelf } = await requireShelf(event)
  const cancelled = await cancelShelfInvite(useDb(), {
    shelfId: shelf.id,
    inviteId: getRouterParam(event, 'inviteId')!,
  })

  if (!cancelled) {
    throw createError({ statusCode: 404, statusMessage: 'Invite not found' })
  }

  return sendNoContent(event)
})
