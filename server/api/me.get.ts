import { defineEventHandler } from 'h3'
import { useDb } from '../utils/db'
import { requireUser } from '../utils/session'
import { listShelves } from '../utils/shelves'

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
