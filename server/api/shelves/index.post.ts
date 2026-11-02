import { defineEventHandler, setResponseStatus } from 'h3'
import { newShelfSchema } from '#shared/utils/schemas'
import { useDb } from '#server/utils/db'
import { requireUser } from '#server/utils/session'
import { createShelf } from '#server/utils/shelves'
import { readValidBody } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const user = await requireUser(event)
  const { name } = await readValidBody(event, newShelfSchema)

  const shelf = await createShelf(useDb(), { name, ownerId: user.id })
  setResponseStatus(event, 201)

  return shelf
})
