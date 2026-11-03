import { defineEventHandler } from 'h3'
import { catalogSearchSchema } from '#shared/utils/schemas'
import { listCatalog } from '#server/utils/catalog'
import { useDb } from '#server/utils/db'
import { requireShelf } from '#server/utils/session'
import { readValidQuery } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const { shelf } = await requireShelf(event)
  const search = readValidQuery(event, catalogSearchSchema)

  return listCatalog(useDb(), { shelfId: shelf.id, search })
})
