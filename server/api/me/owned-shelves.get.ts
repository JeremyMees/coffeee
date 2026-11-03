import { defineEventHandler } from 'h3'
import { listOwnedShelves } from '#server/utils/accounts'
import { useDb } from '#server/utils/db'
import { requireUser } from '#server/utils/session'

export default defineEventHandler(async event => {
  const user = await requireUser(event)

  return listOwnedShelves(useDb(), user.id)
})
