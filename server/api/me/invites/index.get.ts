import { defineEventHandler } from 'h3'
import { useDb } from '#server/utils/db'
import { listInvitesFor } from '#server/utils/invites'
import { requireUser } from '#server/utils/session'

export default defineEventHandler(async event => {
  const user = await requireUser(event)

  return listInvitesFor(useDb(), user.email)
})
