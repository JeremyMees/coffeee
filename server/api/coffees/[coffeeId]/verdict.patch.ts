import { defineEventHandler, getRouterParam } from 'h3'
import { verdictSchema } from '#shared/utils/schemas'
import { useDb } from '#server/utils/db'
import { orNotFound, requireUser } from '#server/utils/session'
import { readValidBody } from '#server/utils/validation'
import { judgeCoffee } from '#server/utils/verdicts'

export default defineEventHandler(async event => {
  const user = await requireUser(event)
  const verdict = await readValidBody(event, verdictSchema)

  return orNotFound(
    await judgeCoffee(useDb(), {
      coffeeId: getRouterParam(event, 'coffeeId')!,
      userId: user.id,
      verdict,
    }),
    'Coffee not found',
  )
})
