import { defineEventHandler } from 'h3'
import { profileNameSchema } from '#shared/utils/schemas'
import { renameUser } from '#server/utils/accounts'
import { useDb } from '#server/utils/db'
import { requireUser } from '#server/utils/session'
import { readValidBody } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const user = await requireUser(event)
  const { name } = await readValidBody(event, profileNameSchema)

  return renameUser(useDb(), { userId: user.id, name })
})
