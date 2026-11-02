import { createError, defineEventHandler, getRouterParam } from 'h3'
import { roasterDetailsSchema } from '#shared/utils/schemas'
import { useDb } from '#server/utils/db'
import { editRoaster } from '#server/utils/roasters'
import { refuseRoasterEdit, requireUser } from '#server/utils/session'
import { readValidBody } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const user = await requireUser(event)
  const details = await readValidBody(event, roasterDetailsSchema)
  const result = await editRoaster(useDb(), {
    roasterId: getRouterParam(event, 'roasterId')!,
    editor: user,
    details,
  })

  if (result.outcome === 'notFound' || result.outcome === 'forbidden') {
    refuseRoasterEdit(result.outcome)
  }

  if (result.outcome === 'taken') {
    const message = `There is already a roaster called ${result.taken.name}`

    throw createError({
      statusCode: 409,
      statusMessage: message,
      data: { errors: { name: message } },
    })
  }

  return result.roaster
})
