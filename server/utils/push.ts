import { useRuntimeConfig } from 'nitropack/runtime'
import { sendNotification, WebPushError } from 'web-push'
import type { PushMessage, PushOutcome, PushTarget } from '#server/types/push'

const goneStatuses = [404, 410]
const dayInSeconds = 24 * 60 * 60

export async function sendPush(
  target: PushTarget,
  message: PushMessage,
): Promise<PushOutcome> {
  const config = useRuntimeConfig()

  try {
    await sendNotification(
      {
        endpoint: target.endpoint,
        keys: { p256dh: target.p256dh, auth: target.auth },
      },
      JSON.stringify(message),
      {
        TTL: dayInSeconds,
        urgency: 'high',
        vapidDetails: {
          subject: config.productionUrl,
          publicKey: config.public.vapidPublicKey,
          privateKey: config.vapidPrivateKey,
        },
      },
    )

    return 'sent'
  } catch (caught) {
    if (
      caught instanceof WebPushError &&
      goneStatuses.includes(caught.statusCode)
    ) {
      return 'gone'
    }

    throw caught
  }
}
