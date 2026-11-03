import { createError, defineEventHandler } from 'h3'
import { adminListNouns } from '#shared/utils/admin'
import {
  adminEntryChangesSchema,
  updateAdminEntry,
} from '#server/utils/admin-lists'
import { useDb } from '#server/utils/db'
import { requireAdminList } from '#server/utils/session'
import { readValidBody } from '#server/utils/validation'

function refuse(field: string, message: string): never {
  throw createError({
    statusCode: 409,
    statusMessage: message,
    data: { errors: { [field]: message } },
  })
}

export default defineEventHandler(async event => {
  const { user, list, entryId } = await requireAdminList(event)
  const body: Record<string, string> = await readValidBody(
    event,
    adminEntryChangesSchema(list),
  )
  const changes = 'model' in body ? { ...body, name: body.model! } : body
  const result = await updateAdminEntry(useDb(), {
    list,
    entryId,
    userId: user.id,
    changes: changes as { name: string },
  })

  if (result.outcome === 'notFound') {
    throw createError({ statusCode: 404, statusMessage: 'Entry not found' })
  }

  if (result.outcome === 'inUse') {
    const { one } = adminListNouns[list]

    refuse(
      'originCode',
      `Coffees use this ${one}, so merge it into a ${one} in that country instead`,
    )
  }

  if (result.outcome === 'taken') {
    refuse(
      list === 'grinders' ? 'model' : 'name',
      `${result.taken.name} already exists, merge them instead`,
    )
  }

  return result.entry
})
