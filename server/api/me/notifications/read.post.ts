import { defineEventHandler, sendNoContent } from 'h3'
import { useDb } from '#server/utils/db'
import { markNotificationsRead } from '#server/utils/notifications'
import { requireUser } from '#server/utils/session'

export default defineEventHandler(async event => {
  const user = await requireUser(event)
  await markNotificationsRead(useDb(), user.id)

  return sendNoContent(event)
})
