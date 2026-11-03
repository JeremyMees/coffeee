import { defineEventHandler } from 'h3'
import { notificationEmailsSchema } from '#shared/utils/schemas'
import { useDb } from '#server/utils/db'
import { listEmailedKinds, setEmailedKinds } from '#server/utils/notifications'
import { requireUser } from '#server/utils/session'
import { readValidBody } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const user = await requireUser(event)
  const { emailed } = await readValidBody(event, notificationEmailsSchema)
  const db = useDb()
  await setEmailedKinds(db, { userId: user.id, emailed })

  return { emailed: await listEmailedKinds(db, user.id) }
})
