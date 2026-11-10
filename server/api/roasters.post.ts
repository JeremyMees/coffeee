import { createError, defineEventHandler, setResponseStatus } from 'h3'
import { roasterDetailsSchema } from '#shared/utils/schemas'
import { findOrCreateRoaster } from '#server/utils/catalog-entries'
import { useDb } from '#server/utils/db'
import { requireUser } from '#server/utils/session'
import { readValidBody } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const user = await requireUser(event)
  const details = await readValidBody(event, roasterDetailsSchema)
  const added = await findOrCreateRoaster(useDb(), {
    ...details,
    createdBy: user.id,
  })

  if (!added.created) {
    const message = `There is already a roaster called ${added.roaster.name}`

    throw createError({
      statusCode: 409,
      statusMessage: message,
      data: { errors: { name: message } },
    })
  }

  setResponseStatus(event, 201)

  return added.roaster
})
