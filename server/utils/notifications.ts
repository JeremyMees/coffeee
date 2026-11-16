import { and, count, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { Database } from '#server/types/database'
import type {
  InviteStatus,
  NotificationKind,
  OptionalEmailKind,
} from '#shared/types/notifications'
import {
  notificationKinds,
  notificationText,
} from '#shared/utils/notifications'
import { shelfCoffeePath, shelfPath } from '#shared/utils/slugs'
import {
  coffee,
  invite,
  notification,
  notificationEmail,
  notificationPushOff,
  shelf,
  shelfMember,
  user,
} from '#server/db/schemas'
import { sendEmail } from '#server/utils/email'
import { pushToUsers } from '#server/utils/push-subscriptions'

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

type ShelfNewsAbout = { text: string; shelf: string; path: string }

async function describeShelfNews(
  db: Database,
  news: ShelfNews,
): Promise<ShelfNewsAbout> {
  const [found] = await db
    .select({ shelf: shelf.name, actor: user.name })
    .from(shelf)
    .leftJoin(user, eq(user.id, news.actorId))
    .where(eq(shelf.id, news.shelfId))
  const [about] = news.coffeeId
    ? await db
        .select({ name: coffee.name })
        .from(coffee)
        .where(eq(coffee.id, news.coffeeId))
    : []

  const onShelf = { id: news.shelfId, name: found!.shelf }

  return {
    text: notificationText({
      kind: news.kind,
      actor: found!.actor,
      shelf: found!.shelf,
      coffee: about?.name ?? null,
    }),
    shelf: found!.shelf,
    path: about
      ? shelfCoffeePath(onShelf, { id: news.coffeeId!, name: about.name })
      : shelfPath(onShelf),
  }
}

async function emailShelfNews(
  db: Database,
  news: Told,
  about: ShelfNewsAbout,
  origin: string,
) {
  const recipients = await db
    .select({ email: user.email })
    .from(notificationEmail)
    .innerJoin(user, eq(user.id, notificationEmail.userId))
    .where(
      and(
        inArray(notificationEmail.userId, news.userIds),
        eq(notificationEmail.kind, news.kind),
      ),
    )

  const sent = await Promise.allSettled(
    recipients.map(recipient =>
      sendEmail({
        to: recipient.email,
        subject: about.text,
        template: 'ShelfNotification',
        values: {
          text: about.text,
          link: origin + about.path,
          settings: notificationSettingsLink(origin),
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

async function tellShelfNews(db: Database, news: Told, origin: string) {
  const about = await describeShelfNews(db, news)

  await Promise.all([
    emailShelfNews(db, news, about, origin).catch(caught =>
      console.error('Could not send a notification email', caught),
    ),
    pushToUsers(db, {
      userIds: news.userIds,
      kind: news.kind,
      message: { title: about.shelf, body: about.text, path: about.path },
    }).catch(caught => console.error('Could not send a push', caught)),
  ])
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
    await tellShelfNews(db, news, origin).catch(caught =>
      console.error('Could not tell about shelf news', caught),
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

  await pushInvite(db, { ...input, userId: invited.id }).catch(caught =>
    console.error('Could not send a push', caught),
  )
}

async function pushInvite(
  db: Database,
  input: { userId: string; actorId: string; shelfId: string },
) {
  const [found] = await db
    .select({ shelf: shelf.name, actor: user.name })
    .from(shelf)
    .leftJoin(user, eq(user.id, input.actorId))
    .where(eq(shelf.id, input.shelfId))

  await pushToUsers(db, {
    userIds: [input.userId],
    kind: 'invited',
    message: {
      title: found!.shelf,
      body: notificationText({
        kind: 'invited',
        actor: found!.actor,
        shelf: found!.shelf,
        coffee: null,
      }),
      path: '/notifications',
    },
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

export async function listPushedKinds(db: Database, userId: string) {
  const found = await db
    .select({ kind: notificationPushOff.kind })
    .from(notificationPushOff)
    .where(eq(notificationPushOff.userId, userId))
  const off = new Set(found.map(row => row.kind))

  return notificationKinds.filter(kind => !off.has(kind))
}

export async function setPushedKinds(
  db: Database,
  input: { userId: string; pushed: NotificationKind[] },
) {
  const pushed = new Set(input.pushed)
  const off = notificationKinds.filter(kind => !pushed.has(kind))

  await db.transaction(async tx => {
    await tx
      .delete(notificationPushOff)
      .where(eq(notificationPushOff.userId, input.userId))

    if (off.length === 0) return

    await tx
      .insert(notificationPushOff)
      .values(off.map(kind => ({ userId: input.userId, kind })))
  })
}
