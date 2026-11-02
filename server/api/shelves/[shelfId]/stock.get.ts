import { defineEventHandler } from 'h3'
import { listStock } from '#server/utils/coffees'
import { useDb } from '#server/utils/db'
import { requireShelf } from '#server/utils/session'

export default defineEventHandler(async event => {
  const { shelf } = await requireShelf(event)

  return listStock(useDb(), shelf.id)
})
