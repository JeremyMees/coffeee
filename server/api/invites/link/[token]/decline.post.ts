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
  await requireUser(event)
  const declined = await declineInvite(useDb(), {
    token: getRouterParam(event, 'token')!,
  })

  if (!declined) {
    throw createError({
      statusCode: 404,
      statusMessage: 'This invite has expired or was already used',
    })
  }

  return sendNoContent(event)
})
