import { defineEventHandler } from 'h3'
import { listSearchSchema } from '#shared/utils/schemas'
import { roaster } from '#server/db/schemas'
import { useDb } from '#server/utils/db'
import { findSimilar } from '#server/utils/lists'
import { requireUser } from '#server/utils/session'
import { readValidQuery } from '#server/utils/validation'

export default defineEventHandler(async event => {
  await requireUser(event)
  const { search } = readValidQuery(event, listSearchSchema)

  return findSimilar(useDb(), roaster, search)
})
