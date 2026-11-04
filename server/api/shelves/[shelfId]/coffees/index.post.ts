import { defineEventHandler, getRequestURL, setResponseStatus } from 'h3'
import { newCoffeeSchema } from '#shared/utils/schemas'
import { addCoffee } from '#server/utils/coffees'
import { useDb } from '#server/utils/db'
import { requireShelf } from '#server/utils/session'
import { readValidBody } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const { user, shelf } = await requireShelf(event)
  const coffee = await readValidBody(event, newCoffeeSchema)
  const added = await addCoffee(useDb(), {
    shelfId: shelf.id,
    userId: user.id,
    coffee,
    origin: getRequestURL(event).origin,
  })
  setResponseStatus(event, 201)

  return added
})
