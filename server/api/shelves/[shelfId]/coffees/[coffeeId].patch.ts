import { createError, defineEventHandler, getRouterParam } from 'h3'
import { coffeeDetailsSchema } from '#shared/utils/schemas'
import { editCoffee } from '#server/utils/coffees'
import { useDb } from '#server/utils/db'
import { requireShelf } from '#server/utils/session'
import { readValidBody } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const { user } = await requireShelf(event)
  const details = await readValidBody(event, coffeeDetailsSchema)
  const result = await editCoffee(useDb(), {
    coffeeId: getRouterParam(event, 'coffeeId')!,
    editor: user,
    details,
  })

  if (result.outcome === 'notFound') {
    throw createError({ statusCode: 404, statusMessage: 'Coffee not found' })
  }

  if (result.outcome === 'forbidden') {
    throw createError({
      statusCode: 403,
      statusMessage:
        'Only the person who added this coffee or an admin can edit it',
    })
  }

  if (result.outcome === 'taken') {
    const message = `${result.taken.roaster} already has a coffee called ${result.taken.name}`

    throw createError({
      statusCode: 409,
      statusMessage: message,
      data: { errors: { name: message } },
    })
  }

  return result.coffee
})
