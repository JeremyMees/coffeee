import { defineEventHandler } from 'h3'
import { useDb } from '#server/utils/db'
import { requireShelf } from '#server/utils/session'
import { listShelfMembers } from '#server/utils/shelves'

export default defineEventHandler(async event => {
  const { shelf } = await requireShelf(event)

  return listShelfMembers(useDb(), shelf.id)
})
