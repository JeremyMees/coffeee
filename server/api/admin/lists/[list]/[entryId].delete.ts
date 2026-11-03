import { createError, defineEventHandler, sendNoContent } from 'h3'
import { adminListNouns } from '#shared/utils/admin'
import { deleteAdminEntry } from '#server/utils/admin-lists'
import { useDb } from '#server/utils/db'
import { requireAdminList } from '#server/utils/session'

export default defineEventHandler(async event => {
  const { list, entryId } = await requireAdminList(event)
  const result = await deleteAdminEntry(useDb(), { list, entryId })

  if (result.outcome === 'notFound') {
    throw createError({ statusCode: 404, statusMessage: 'Entry not found' })
  }

  if (result.outcome === 'inUse') {
    const nouns = adminListNouns[list]

    throw createError({
      statusCode: 409,
      statusMessage: `This ${nouns.one} still has ${nouns.uses}, merge it into another ${nouns.one} instead`,
    })
  }

  return sendNoContent(event)
})
