import {
  appendResponseHeader,
  createError,
  defineEventHandler,
  sendNoContent,
} from 'h3'
import { accountDeletionSchema } from '#shared/utils/schemas'
import { deleteAccount } from '#server/utils/accounts'
import { useAuth } from '#server/utils/auth'
import { useDb } from '#server/utils/db'
import { requireUser } from '#server/utils/session'
import { readValidBody } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const user = await requireUser(event)
  const { heirs } = await readValidBody(event, accountDeletionSchema)
  const result = await deleteAccount(useDb(), { userId: user.id, heirs })

  if (result.outcome === 'noAdmin') {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Coffeee needs another admin to look after the coffees you added first',
    })
  }

  if (result.outcome === 'heirMissing') {
    throw createError({
      statusCode: 400,
      statusMessage: `Choose who takes over ${result.shelf.name}`,
    })
  }

  const { headers } = await useAuth().api.signOut({
    headers: event.headers,
    returnHeaders: true,
  })

  for (const cookie of headers.getSetCookie()) {
    appendResponseHeader(event, 'set-cookie', cookie)
  }

  return sendNoContent(event)
})
