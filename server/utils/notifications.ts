import { and, count, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { Database } from '#server/types/database'
import type {
  InviteStatus,
  OptionalEmailKind,
} from '#shared/types/notifications'
import { notificationText } from '#shared/utils/notifications'
import { shelfCoffeePath, shelfPath } from '#shared/utils/slugs'
import {
  coffee,
  invite,
  notification,
  notificationEmail,
  shelf,
  shelfMember,
  user,
} from '#server/db/schemas'
import { sendEmail } from '#server/utils/email'

const notificationsShown = 50

type ShelfNews = {
  shelfId: string
  actorId: string
  kind: OptionalEmailKind
  coffeeId?: string
  skip?: string
}

type Told = ShelfNews & { userIds: string[] }

export type NotifyShelf = (news: ShelfNews) => Promise<void>

export function notificationSettingsLink(origin: string) {
  return `${origin}/profile?tab=notifications`
}

async function emailShelfNews(db: Database, input: Told & { origin: string }) {
  const recipients = await db
    .select({ email: user.email })
    .from(notificationEmail)
    .innerJoin(user, eq(user.id, notificationEmail.userId))
    .where(
      and(
        inArray(notificationEmail.userId, input.userIds),
        eq(notificationEmail.kind, input.kind),
      ),
    )

  if (recipients.length === 0) return

  const [found] = await db
    .select({ shelf: shelf.name, actor: user.name })
    .from(shelf)
    .leftJoin(user, eq(user.id, input.actorId))
    .where(eq(shelf.id, input.shelfId))
  const [about] = input.coffeeId
    ? await db
        .select({ name: coffee.name })
        .from(coffee)
        .where(eq(coffee.id, input.coffeeId))
    : []

  const text = notificationText({
    kind: input.kind,
    actor: found!.actor,
    shelf: found!.shelf,
    coffee: about?.name ?? null,
  })
  const onShelf = { id: input.shelfId, name: found!.shelf }

  const sent = await Promise.allSettled(
    recipients.map(recipient =>
      sendEmail({
        to: recipient.email,
        subject: text,
        template: 'ShelfNotification',
        values: {
          text,
          link:
            input.origin +
            (about
              ? shelfCoffeePath(onShelf, {
                  id: input.coffeeId!,
                  name: about.name,
                })
              : shelfPath(onShelf)),
          settings: notificationSettingsLink(input.origin),
        },
      }),
    ),
  )

  for (const result of sent) {
    if (result.status === 'rejected') {
      console.error('Could not send a notification email', result.reason)
    }
  }
}

async function recordShelfNews(db: Database, news: ShelfNews) {
  const members = await db
    .select({ userId: shelfMember.userId })
    .from(shelfMember)
    .where(
      and(
        eq(shelfMember.shelfId, news.shelfId),
        ne(shelfMember.userId, news.actorId),
        news.skip ? ne(shelfMember.userId, news.skip) : undefined,
      ),
    )

  if (members.length > 0) {
    await db.insert(notification).values(
      members.map(member => ({
        userId: member.userId,
        kind: news.kind,
        actorId: news.actorId,
        shelfId: news.shelfId,
        coffeeId: news.coffeeId,
      })),
    )
  }

  return members.map(member => member.userId)
}

export async function changeShelf<T>(
  db: Database,
  origin: string,
  change: (tx: Database, notify: NotifyShelf) => Promise<T>,
) {
  const told: Told[] = []
  const changed = await db.transaction(tx =>
    change(tx, async news => {
      const userIds = await recordShelfNews(tx, news)

      if (userIds.length > 0) told.push({ ...news, userIds })
    }),
  )

  for (const news of told) {
    await emailShelfNews(db, { ...news, origin }).catch(caught =>
      console.error('Could not send a notification email', caught),
    )
  }

  return changed
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
      inviteId: invite.id,
      inviteStatus: sql<InviteStatus | null>`case
        when ${invite.id} is null then null
        when ${invite.usedAt} is not null then 'accepted'
        when ${invite.expiresAt} <= now() then 'expired'
        else 'pending'
      end`,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
    })
    .from(notification)
    .innerJoin(shelf, eq(shelf.id, notification.shelfId))
    .leftJoin(actor, eq(actor.id, notification.actorId))
    .leftJoin(coffee, eq(coffee.id, notification.coffeeId))
    .leftJoin(invite, eq(invite.id, notification.inviteId))
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

export async function listEmailedKinds(db: Database, userId: string) {
  const found = await db
    .select({ kind: notificationEmail.kind })
    .from(notificationEmail)
    .where(eq(notificationEmail.userId, userId))

  return found.map(row => row.kind as OptionalEmailKind)
}

export async function setEmailedKinds(
  db: Database,
  input: { userId: string; emailed: OptionalEmailKind[] },
) {
  await db.transaction(async tx => {
    await tx
      .delete(notificationEmail)
      .where(eq(notificationEmail.userId, input.userId))

    if (input.emailed.length === 0) return

    await tx.insert(notificationEmail).values(
      [...new Set(input.emailed)].map(kind => ({
        userId: input.userId,
        kind,
      })),
    )
  })
}
