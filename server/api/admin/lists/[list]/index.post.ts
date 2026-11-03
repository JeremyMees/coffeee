import { createError, defineEventHandler, setResponseStatus } from 'h3'
import { addAdminEntry, adminEntrySchema } from '#server/utils/admin-lists'
import { useDb } from '#server/utils/db'
import { requireAdminList } from '#server/utils/session'
import { readValidBody } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const { user, list } = await requireAdminList(event)
  const body = await readValidBody(event, adminEntrySchema(list))
  const result = await addAdminEntry(useDb(), {
    list,
    body,
    createdBy: user.id,
  })

  if (result.outcome === 'taken') {
    throw createError({
      statusCode: 409,
      statusMessage: result.message,
      data: { errors: { [result.field]: result.message } },
    })
  }

  setResponseStatus(event, 201)

  return result.entry
})
