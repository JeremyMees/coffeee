import { defineEventHandler } from 'h3'
import { useDb } from '#server/utils/db'
import { countUnreadNotifications } from '#server/utils/notifications'
import { requireUser } from '#server/utils/session'

export default defineEventHandler(async event => {
  const user = await requireUser(event)

  return { unread: await countUnreadNotifications(useDb(), user.id) }
})
