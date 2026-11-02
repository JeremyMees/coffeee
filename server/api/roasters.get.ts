import { defineEventHandler } from 'h3'
import { listRoasters } from '#server/utils/coffees'
import { useDb } from '#server/utils/db'
import { requireUser } from '#server/utils/session'

export default defineEventHandler(async event => {
  await requireUser(event)

  return listRoasters(useDb())
})
