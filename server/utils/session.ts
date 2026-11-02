import { createError, getRouterParam } from 'h3'
import type { H3Event } from 'h3'
import { useAuth } from '#server/utils/auth'
import { useDb } from '#server/utils/db'
import { findShelf } from '#server/utils/shelves'

export async function requireUser(event: H3Event) {
  const session = await useAuth().api.getSession({ headers: event.headers })

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Sign in first' })
  }

  return session.user
}

export async function requireAdmin(event: H3Event) {
  const user = await requireUser(event)

  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only admins can do that',
    })
  }

  return user
}

export async function requireShelf(event: H3Event) {
  const user = await requireUser(event)
  const shelf = await findShelf(useDb(), {
    shelfId: getRouterParam(event, 'shelfId')!,
    userId: user.id,
  })

  if (!shelf) {
    throw createError({ statusCode: 404, statusMessage: 'Shelf not found' })
  }

  return { user, shelf }
}
