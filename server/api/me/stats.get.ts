import { defineEventHandler } from 'h3'
import { useDb } from '#server/utils/db'
import { requireUser } from '#server/utils/session'
import { profileStatsOf } from '#server/utils/stats'

export default defineEventHandler(async event => {
  const user = await requireUser(event)

  return profileStatsOf(useDb(), user.id)
})
