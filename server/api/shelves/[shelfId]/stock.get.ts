import { defineEventHandler } from 'h3'
import { listStock } from '../../../utils/coffees'
import { useDb } from '../../../utils/db'
import { requireShelf } from '../../../utils/session'

export default defineEventHandler(async event => {
  const { shelf } = await requireShelf(event)

  return listStock(useDb(), shelf.id)
})
