import { createError } from 'h3'
import type { H3Event } from 'h3'
import { useAuth } from './auth'

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
