import { createError, defineEventHandler } from 'h3'
import { adminListNouns } from '#shared/utils/admin'
import { entryMergeSchema } from '#shared/utils/schemas'
import { mergeAdminEntry } from '#server/utils/admin-lists'
import { useDb } from '#server/utils/db'
import { requireAdminList } from '#server/utils/session'
import { readValidBody } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const { list, entryId } = await requireAdminList(event)
  const { intoId } = await readValidBody(event, entryMergeSchema)
  const result = await mergeAdminEntry(useDb(), { list, entryId, intoId })
  const nouns = adminListNouns[list]

  if (result.outcome === 'notFound') {
    throw createError({ statusCode: 404, statusMessage: 'Entry not found' })
  }

  if (result.outcome === 'same' || result.outcome === 'otherScope') {
    const message =
      result.outcome === 'same'
        ? `Pick another ${nouns.one} to keep`
        : `Pick a ${nouns.one} in the same country`

    throw createError({
      statusCode: 400,
      statusMessage: message,
      data: { errors: { intoId: message } },
    })
  }

  return result.entry
})
