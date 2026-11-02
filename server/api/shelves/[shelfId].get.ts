import { defineEventHandler } from 'h3'
import { requireShelf } from '../../utils/session'

export default defineEventHandler(async event => {
  const { shelf } = await requireShelf(event)

  return shelf
})
