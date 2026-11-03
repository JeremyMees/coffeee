import {
  createError,
  defineEventHandler,
  getRouterParam,
  sendNoContent,
} from 'h3'
import { deleteCoffee } from '#server/utils/coffees'
import { useDb } from '#server/utils/db'
import { requireUser } from '#server/utils/session'

export default defineEventHandler(async event => {
  const user = await requireUser(event)
  const result = await deleteCoffee(useDb(), {
    coffeeId: getRouterParam(event, 'coffeeId')!,
    deleter: user,
  })

  if (result.outcome === 'notFound') {
    throw createError({ statusCode: 404, statusMessage: 'Coffee not found' })
  }

  if (result.outcome === 'forbidden') {
    throw createError({
      statusCode: 403,
      statusMessage:
        'Only the person who added this coffee or an admin can delete it',
    })
  }

  if (result.outcome === 'boughtByOthers') {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Someone else has bought this coffee too, so only an admin can delete it',
    })
  }

  return sendNoContent(event)
})
