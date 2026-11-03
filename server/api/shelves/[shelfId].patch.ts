import { defineEventHandler } from 'h3'
import { newShelfSchema } from '#shared/utils/schemas'
import { useDb } from '#server/utils/db'
import { requireShelfOwner } from '#server/utils/session'
import { renameShelf } from '#server/utils/shelves'
import { readValidBody } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const { shelf } = await requireShelfOwner(event)
  const { name } = await readValidBody(event, newShelfSchema)

  return renameShelf(useDb(), { shelfId: shelf.id, name })
})
