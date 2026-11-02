import { createError, defineEventHandler, setResponseStatus } from 'h3'
import { newBrewMethodSchema } from '#shared/utils/schemas'
import { addBrewMethod } from '#server/utils/brew-methods'
import { useDb } from '#server/utils/db'
import { requireAdmin } from '#server/utils/session'
import { readValidBody } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const user = await requireAdmin(event)
  const brewMethod = await readValidBody(event, newBrewMethodSchema)

  const added = await addBrewMethod(useDb(), {
    createdBy: user.id,
    brewMethod,
  })

  if (!added) {
    const message = `${brewMethod.name} is already a brew method`

    throw createError({
      statusCode: 409,
      statusMessage: message,
      data: { errors: { name: message } },
    })
  }

  setResponseStatus(event, 201)

  return added
})
