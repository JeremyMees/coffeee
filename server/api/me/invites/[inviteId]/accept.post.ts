import { defineEventHandler, getRouterParam } from 'h3'
import { useDb } from '#server/utils/db'
import { acceptInvite } from '#server/utils/invites'
import { notifyShelf } from '#server/utils/notifications'
import { orNotFound, requireUser } from '#server/utils/session'

export default defineEventHandler(async event => {
  const user = await requireUser(event)
  const db = useDb()
  const joined = orNotFound(
    await acceptInvite(db, {
      userId: user.id,
      email: user.email,
      match: {
        inviteId: getRouterParam(event, 'inviteId')!,
        email: user.email,
      },
    }),
    'Invite not found',
  )

  await notifyShelf(db, {
    shelfId: joined.id,
    actorId: user.id,
    kind: 'memberJoined',
  })

  return joined
})
