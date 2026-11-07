import { appendResponseHeader, createError, getRouterParam } from 'h3'
import type { H3Event } from 'h3'
import { isAdminList } from '#shared/utils/admin'
import { useAuth } from '#server/utils/auth'
import { findEditableCoffee } from '#server/utils/coffees'
import { useDb } from '#server/utils/db'
import { findEditableRoaster } from '#server/utils/roasters'
import { findShelf } from '#server/utils/shelves'

export async function requireUser(
  event: H3Event,
  options: { fresh?: boolean } = {},
) {
  const { headers, response: session } = await useAuth().api.getSession({
    headers: event.headers,
    query: options.fresh ? { disableCookieCache: true } : undefined,
    returnHeaders: true,
  })

  for (const cookie of headers.getSetCookie()) {
    appendResponseHeader(event, 'set-cookie', cookie)
  }

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

export async function requireAdminList(event: H3Event) {
  const user = await requireAdmin(event)
  const list = getRouterParam(event, 'list')!

  if (!isAdminList(list)) {
    throw createError({ statusCode: 404, statusMessage: 'List not found' })
  }

  return { user, list, entryId: getRouterParam(event, 'entryId')! }
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

export async function requireShelfOwner(event: H3Event) {
  const found = await requireShelf(event)

  if (found.shelf.ownerId !== found.user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only the shelf owner can do that',
    })
  }

  return found
}

export function refuseCoffeeEdit(outcome: 'notFound' | 'forbidden'): never {
  if (outcome === 'notFound') {
    throw createError({ statusCode: 404, statusMessage: 'Coffee not found' })
  }

  throw createError({
    statusCode: 403,
    statusMessage:
      'Only the person who added this coffee or an admin can edit it',
  })
}

export async function requireEditableCoffee(event: H3Event) {
  const { user } = await requireShelf(event)
  const coffeeId = getRouterParam(event, 'coffeeId')!
  const found = await findEditableCoffee(useDb(), { coffeeId, editor: user })

  if (found.outcome !== 'editable') refuseCoffeeEdit(found.outcome)

  return { coffeeId, photoUrl: found.photoUrl }
}

export function refuseRoasterEdit(outcome: 'notFound' | 'forbidden'): never {
  if (outcome === 'notFound') {
    throw createError({ statusCode: 404, statusMessage: 'Roaster not found' })
  }

  throw createError({
    statusCode: 403,
    statusMessage:
      'Only the person who added this roaster or an admin can edit it',
  })
}

export async function requireEditableRoaster(event: H3Event) {
  const user = await requireUser(event)
  const roasterId = getRouterParam(event, 'roasterId')!
  const found = await findEditableRoaster(useDb(), { roasterId, editor: user })

  if (found.outcome !== 'editable') refuseRoasterEdit(found.outcome)

  return { roasterId, logoUrl: found.logoUrl }
}

export async function requireShelfPurchase(event: H3Event) {
  const { shelf } = await requireShelf(event)

  return {
    shelfId: shelf.id,
    coffeeId: getRouterParam(event, 'coffeeId')!,
    purchaseId: getRouterParam(event, 'purchaseId')!,
  }
}

export function orNotFound<Found>(
  found: Found | undefined,
  statusMessage: string,
) {
  if (found === undefined) {
    throw createError({ statusCode: 404, statusMessage })
  }

  return found
}
