import { defineEventHandler } from 'h3'
import { notificationPushesSchema } from '#shared/utils/schemas'
import { useDb } from '#server/utils/db'
import { listPushedKinds, setPushedKinds } from '#server/utils/notifications'
import { requireUser } from '#server/utils/session'
import { readValidBody } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const user = await requireUser(event)
  const { pushed } = await readValidBody(event, notificationPushesSchema)
  const db = useDb()
  await setPushedKinds(db, { userId: user.id, pushed })

  return { pushed: await listPushedKinds(db, user.id) }
})
