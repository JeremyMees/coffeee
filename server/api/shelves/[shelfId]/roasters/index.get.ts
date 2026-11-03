import { defineEventHandler } from 'h3'
import { roasterSearchSchema } from '#shared/utils/schemas'
import { useDb } from '#server/utils/db'
import { listRoasters } from '#server/utils/roasters'
import { requireShelf } from '#server/utils/session'
import { readValidQuery } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const { shelf } = await requireShelf(event)
  const search = readValidQuery(event, roasterSearchSchema)

  return listRoasters(useDb(), { shelfId: shelf.id, search })
})
