import { defineEventHandler } from 'h3'
import { useDb } from '#server/utils/db'
import { listShelfInvites } from '#server/utils/invites'
import { requireShelf } from '#server/utils/session'

export default defineEventHandler(async event => {
  const { shelf } = await requireShelf(event)

  return listShelfInvites(useDb(), shelf.id)
})
