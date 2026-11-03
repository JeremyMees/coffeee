import { defineEventHandler } from 'h3'
import { filterLabelsSchema } from '#shared/utils/schemas'
import { useDb } from '#server/utils/db'
import { findFilterLabels } from '#server/utils/filters'
import { requireShelf } from '#server/utils/session'
import { readValidQuery } from '#server/utils/validation'

export default defineEventHandler(async event => {
  await requireShelf(event)

  return findFilterLabels(useDb(), readValidQuery(event, filterLabelsSchema))
})
