import {
  createError,
  defineEventHandler,
  readBody,
  setResponseStatus,
} from 'h3'
import { useDb } from '../../utils/db'
import { requireUser } from '../../utils/session'
import { createShelf } from '../../utils/shelves'

const maxNameLength = 40

export default defineEventHandler(async event => {
  const user = await requireUser(event)
  const body = await readBody<{ name?: unknown }>(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''

  if (!name || name.length > maxNameLength) {
    throw createError({
      statusCode: 400,
      statusMessage: `Give the shelf a name of up to ${maxNameLength} characters`,
    })
  }

  const shelf = await createShelf(useDb(), { name, ownerId: user.id })
  setResponseStatus(event, 201)

  return shelf
})
