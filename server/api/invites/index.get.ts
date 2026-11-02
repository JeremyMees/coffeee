import { defineEventHandler } from 'h3'
import { useDb } from '#server/utils/db'
import { listPendingInvites } from '#server/utils/invites'
import { requireAdmin } from '#server/utils/session'

export default defineEventHandler(async event => {
  await requireAdmin(event)

  return listPendingInvites(useDb())
})
