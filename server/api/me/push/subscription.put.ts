import { defineEventHandler, sendNoContent } from 'h3'
import { pushSubscriptionSchema } from '#shared/utils/schemas'
import { useDb } from '#server/utils/db'
import { savePushSubscription } from '#server/utils/push-subscriptions'
import { requireUser } from '#server/utils/session'
import { readValidBody } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const user = await requireUser(event)
  const { endpoint, keys } = await readValidBody(event, pushSubscriptionSchema)

  await savePushSubscription(useDb(), { userId: user.id, endpoint, ...keys })

  return sendNoContent(event)
})
