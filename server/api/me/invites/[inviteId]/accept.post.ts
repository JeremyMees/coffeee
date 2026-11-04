import { defineEventHandler, getRequestURL, getRouterParam } from 'h3'
import { useDb } from '#server/utils/db'
import { acceptInvite } from '#server/utils/invites'
import { orNotFound, requireUser } from '#server/utils/session'

export default defineEventHandler(async event => {
  const user = await requireUser(event)

  return orNotFound(
    await acceptInvite(useDb(), {
      userId: user.id,
      email: user.email,
      origin: getRequestURL(event).origin,
      match: {
        inviteId: getRouterParam(event, 'inviteId')!,
        email: user.email,
      },
    }),
    'Invite not found',
  )
})
