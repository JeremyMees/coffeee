import { and, count, desc, eq, isNull, ne } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { Database } from '#server/types/database'
import type { NotificationKind } from '#shared/types/notifications'
import {
  coffee,
  notification,
  shelf,
  shelfMember,
  user,
} from '#server/db/schemas'

const notificationsShown = 50

export async function notifyShelf(
  db: Database,
  input: {
    shelfId: string
    actorId: string
    kind: Exclude<NotificationKind, 'invited'>
    coffeeId?: string
    skip?: string
  },
) {
  const members = await db
    .select({ userId: shelfMember.userId })
    .from(shelfMember)
    .where(
      and(
        eq(shelfMember.shelfId, input.shelfId),
        ne(shelfMember.userId, input.actorId),
        input.skip ? ne(shelfMember.userId, input.skip) : undefined,
      ),
    )

  if (members.length === 0) return

  await db.insert(notification).values(
    members.map(member => ({
      userId: member.userId,
      kind: input.kind,
      actorId: input.actorId,
      shelfId: input.shelfId,
      coffeeId: input.coffeeId,
    })),
  )
}

export async function notifyInvited(
  db: Database,
  input: { email: string; actorId: string; shelfId: string; inviteId: string },
) {
  const [invited] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, input.email.toLowerCase()))

  if (!invited || invited.id === input.actorId) return

  await db.insert(notification).values({
    userId: invited.id,
    kind: 'invited',
    actorId: input.actorId,
    shelfId: input.shelfId,
    inviteId: input.inviteId,
  })
}

export function listNotifications(db: Database, userId: string) {
  const actor = alias(user, 'actor')

  return db
    .select({
      id: notification.id,
      kind: notification.kind,
      actor: actor.name,
      shelfId: shelf.id,
      shelf: shelf.name,
      coffeeId: coffee.id,
      coffee: coffee.name,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
    })
    .from(notification)
    .innerJoin(shelf, eq(shelf.id, notification.shelfId))
    .leftJoin(actor, eq(actor.id, notification.actorId))
    .leftJoin(coffee, eq(coffee.id, notification.coffeeId))
    .where(eq(notification.userId, userId))
    .orderBy(desc(notification.createdAt))
    .limit(notificationsShown)
}

export async function countUnreadNotifications(db: Database, userId: string) {
  const [found] = await db
    .select({ unread: count() })
    .from(notification)
    .where(and(eq(notification.userId, userId), isNull(notification.readAt)))

  return found!.unread
}

export async function markNotificationsRead(db: Database, userId: string) {
  await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(eq(notification.userId, userId), isNull(notification.readAt)))
}
