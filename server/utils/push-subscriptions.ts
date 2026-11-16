import { and, eq, inArray, notExists } from 'drizzle-orm'
import type { Database } from '#server/types/database'
import type { PushMessage, PushTarget } from '#server/types/push'
import type { NotificationKind } from '#shared/types/notifications'
import { notificationPushOff, pushSubscription } from '#server/db/schemas'
import { sendPush } from '#server/utils/push'

export async function savePushSubscription(
  db: Database,
  input: PushTarget & { userId: string },
) {
  await db
    .insert(pushSubscription)
    .values(input)
    .onConflictDoUpdate({
      target: pushSubscription.endpoint,
      set: { userId: input.userId, p256dh: input.p256dh, auth: input.auth },
    })
}

export async function removePushSubscription(
  db: Database,
  input: { userId: string; endpoint: string },
) {
  await db
    .delete(pushSubscription)
    .where(
      and(
        eq(pushSubscription.userId, input.userId),
        eq(pushSubscription.endpoint, input.endpoint),
      ),
    )
}

export async function pushToUsers(
  db: Database,
  input: { userIds: string[]; kind: NotificationKind; message: PushMessage },
) {
  if (input.userIds.length === 0) return

  const targets = await db
    .select({
      endpoint: pushSubscription.endpoint,
      p256dh: pushSubscription.p256dh,
      auth: pushSubscription.auth,
    })
    .from(pushSubscription)
    .where(
      and(
        inArray(pushSubscription.userId, input.userIds),
        notExists(
          db
            .select()
            .from(notificationPushOff)
            .where(
              and(
                eq(notificationPushOff.userId, pushSubscription.userId),
                eq(notificationPushOff.kind, input.kind),
              ),
            ),
        ),
      ),
    )

  const sent = await Promise.allSettled(
    targets.map(target => sendPush(target, input.message)),
  )

  const gone = targets.filter(
    (_, index) =>
      sent[index]!.status === 'fulfilled' && sent[index]!.value === 'gone',
  )

  for (const result of sent) {
    if (result.status === 'rejected') {
      console.error('Could not send a push', result.reason)
    }
  }

  if (gone.length > 0) {
    await db.delete(pushSubscription).where(
      inArray(
        pushSubscription.endpoint,
        gone.map(target => target.endpoint),
      ),
    )
  }
}
