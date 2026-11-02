import { defineEventHandler } from 'h3'
import { useDb } from '../../utils/db'
import { listPendingInvites } from '../../utils/invites'
import { requireAdmin } from '../../utils/session'

export default defineEventHandler(async event => {
  await requireAdmin(event)

  return listPendingInvites(useDb())
})
