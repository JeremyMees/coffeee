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
      match: { token: getRouterParam(event, 'token')! },
    }),
    'This invite has expired or was already used',
  )
})
