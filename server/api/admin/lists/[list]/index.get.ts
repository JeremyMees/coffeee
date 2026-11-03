import { defineEventHandler } from 'h3'
import { adminEntrySearchSchema } from '#shared/utils/schemas'
import { listAdminEntries } from '#server/utils/admin-lists'
import { useDb } from '#server/utils/db'
import { requireAdminList } from '#server/utils/session'
import { readValidQuery } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const { list } = await requireAdminList(event)
  const search = readValidQuery(event, adminEntrySearchSchema)

  return listAdminEntries(useDb(), { list, search })
})
