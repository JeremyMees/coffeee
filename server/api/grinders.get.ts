import { defineEventHandler } from 'h3'
import { grinderModelSearchSchema } from '#shared/utils/schemas'
import { useDb } from '#server/utils/db'
import { findGrinderModels } from '#server/utils/grinders'
import { requireUser } from '#server/utils/session'
import { readValidQuery } from '#server/utils/validation'

export default defineEventHandler(async event => {
  await requireUser(event)
  const query = readValidQuery(event, grinderModelSearchSchema)

  return findGrinderModels(useDb(), query)
})
