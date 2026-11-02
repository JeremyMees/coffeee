import { defineEventHandler } from 'h3'
import { requireUser } from '../utils/session'

export default defineEventHandler(async event => {
  const user = await requireUser(event)

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
  }
})
