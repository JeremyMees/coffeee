import { defineEventHandler, sendNoContent } from 'h3'
import { pushEndpointSchema } from '#shared/utils/schemas'
import { useDb } from '#server/utils/db'
import { removePushSubscription } from '#server/utils/push-subscriptions'
import { requireUser } from '#server/utils/session'
import { readValidBody } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const user = await requireUser(event)
  const { endpoint } = await readValidBody(event, pushEndpointSchema)

  await removePushSubscription(useDb(), { userId: user.id, endpoint })

  return sendNoContent(event)
})
