import { defineEventHandler } from 'h3'
import { useDb } from '#server/utils/db'
import { listShelfGrinders } from '#server/utils/grinders'
import { requireShelf } from '#server/utils/session'

export default defineEventHandler(async event => {
  const { shelf } = await requireShelf(event)

  return listShelfGrinders(useDb(), shelf.id)
})
