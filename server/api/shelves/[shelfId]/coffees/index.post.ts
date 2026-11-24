import {
  createError,
  defineEventHandler,
  getRequestURL,
  setResponseStatus,
} from 'h3'
import { newCoffeeSchema } from '#shared/utils/schemas'
import { findCatalogCoffee } from '#server/utils/catalog-entries'
import { addCoffee } from '#server/utils/coffees'
import { useDb } from '#server/utils/db'
import { requireShelf } from '#server/utils/session'
import { readValidBody } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const { user, shelf } = await requireShelf(event)
  const coffee = await readValidBody(event, newCoffeeSchema)
  const existing = await findCatalogCoffee(useDb(), {
    shelfId: shelf.id,
    name: coffee.name,
    roaster: coffee.roaster,
  })

  if (existing) {
    const message = `${existing.roaster} already has ${existing.name} in the catalog. Add a bag to it instead.`

    throw createError({
      statusCode: 409,
      statusMessage: message,
      data: { errors: { name: message } },
    })
  }

  const added = await addCoffee(useDb(), {
    shelfId: shelf.id,
    userId: user.id,
    coffee,
    origin: getRequestURL(event).origin,
  })
  setResponseStatus(event, 201)

  return added
})
