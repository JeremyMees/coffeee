import { defineEventHandler } from 'h3'
import { librarySearchSchema } from '#shared/utils/schemas'
import { useDb } from '#server/utils/db'
import { listLibrary } from '#server/utils/library'
import { requireShelf } from '#server/utils/session'
import { readValidQuery } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const { user, shelf } = await requireShelf(event)
  const search = readValidQuery(event, librarySearchSchema)

  return listLibrary(useDb(), { shelfId: shelf.id, userId: user.id, search })
})
