import {
  createError,
  defineEventHandler,
  getRouterParam,
  sendNoContent,
} from 'h3'
import { useDb } from '../../utils/db'
import { revokeInvite } from '../../utils/invites'
import { requireAdmin } from '../../utils/session'

export default defineEventHandler(async event => {
  await requireAdmin(event)
  const revoked = await revokeInvite(useDb(), getRouterParam(event, 'id')!)

  if (!revoked) {
    throw createError({ statusCode: 404, statusMessage: 'Invite not found' })
  }

  return sendNoContent(event)
})
