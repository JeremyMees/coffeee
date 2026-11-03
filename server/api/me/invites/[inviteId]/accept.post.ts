import { defineEventHandler, getRouterParam } from 'h3'
import { useDb } from '#server/utils/db'
import { acceptInvite } from '#server/utils/invites'
import { orNotFound, requireUser } from '#server/utils/session'

export default defineEventHandler(async event => {
  const user = await requireUser(event)
  const joined = await acceptInvite(useDb(), {
    userId: user.id,
    email: user.email,
    match: { inviteId: getRouterParam(event, 'inviteId')!, email: user.email },
  })

  return orNotFound(joined, 'Invite not found')
})
