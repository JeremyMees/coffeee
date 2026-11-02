import { defineEventHandler, setResponseStatus } from 'h3'
import { newCoffeeSchema } from '#shared/utils/schemas'
import { addCoffee } from '../../../../utils/coffees'
import { useDb } from '../../../../utils/db'
import { requireShelf } from '../../../../utils/session'
import { readValidBody } from '../../../../utils/validation'

export default defineEventHandler(async event => {
  const { user, shelf } = await requireShelf(event)
  const coffee = await readValidBody(event, newCoffeeSchema)
  const added = await addCoffee(useDb(), {
    shelfId: shelf.id,
    userId: user.id,
    coffee,
  })
  setResponseStatus(event, 201)

  return added
})
