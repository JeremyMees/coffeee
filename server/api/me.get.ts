import { defineEventHandler } from 'h3'
import { useDb } from '#server/utils/db'
import { requireUser } from '#server/utils/session'
import { listShelves } from '#server/utils/shelves'

export default defineEventHandler(async event => {
  const user = await requireUser(event)

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    shelves: await listShelves(useDb(), user.id),
  }
})
