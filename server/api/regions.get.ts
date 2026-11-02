import { defineEventHandler } from 'h3'
import { regionSearchSchema } from '#shared/utils/schemas'
import { useDb } from '#server/utils/db'
import { findSimilarRegions } from '#server/utils/origins'
import { requireUser } from '#server/utils/session'
import { readValidQuery } from '#server/utils/validation'

export default defineEventHandler(async event => {
  await requireUser(event)

  const query = readValidQuery(event, regionSearchSchema)

  return findSimilarRegions(useDb(), query)
})
