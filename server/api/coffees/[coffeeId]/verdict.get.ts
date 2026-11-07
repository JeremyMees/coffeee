import { defineEventHandler, getRouterParam } from 'h3'
import { useDb } from '#server/utils/db'
import { requireUser } from '#server/utils/session'
import { findVerdict } from '#server/utils/verdicts'

export default defineEventHandler(async event => {
  const user = await requireUser(event)

  return findVerdict(useDb(), {
    userId: user.id,
    coffeeId: getRouterParam(event, 'coffeeId')!,
  })
})
