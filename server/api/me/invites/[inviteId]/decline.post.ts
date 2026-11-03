import {
  createError,
  defineEventHandler,
  getRouterParam,
  sendNoContent,
} from 'h3'
import { useDb } from '#server/utils/db'
import { declineInvite } from '#server/utils/invites'
import { requireUser } from '#server/utils/session'

export default defineEventHandler(async event => {
  const user = await requireUser(event)
  const declined = await declineInvite(useDb(), {
    inviteId: getRouterParam(event, 'inviteId')!,
    email: user.email,
  })

  if (!declined) {
    throw createError({ statusCode: 404, statusMessage: 'Invite not found' })
  }

  return sendNoContent(event)
})
