import {
  foreignKey,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { notificationKinds } from '../../../shared/utils/notifications'
import { user } from './auth.schema'
import { coffee } from './catalog.schema'
import { invite } from './invite.schema'
import { shelf } from './shelf.schema'

export const notificationKind = pgEnum('notificationKind', notificationKinds)

export const notification = pgTable(
  'notification',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text().notNull(),
    kind: notificationKind().notNull(),
    actorId: text(),
    shelfId: text().notNull(),
    coffeeId: text(),
    inviteId: text(),
    createdAt: timestamp().notNull().defaultNow(),
    readAt: timestamp(),
  },
  table => [
    index('notificationUserIdCreatedAtIdx').on(table.userId, table.createdAt),
    index('notificationShelfIdIdx').on(table.shelfId),
    index('notificationCoffeeIdIdx').on(table.coffeeId),
    index('notificationInviteIdIdx').on(table.inviteId),
    foreignKey({
      name: 'notificationUserIdFk',
      columns: [table.userId],
      foreignColumns: [user.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'notificationActorIdFk',
      columns: [table.actorId],
      foreignColumns: [user.id],
    }).onDelete('set null'),
    foreignKey({
      name: 'notificationShelfIdFk',
      columns: [table.shelfId],
      foreignColumns: [shelf.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    foreignKey({
      name: 'notificationCoffeeIdFk',
      columns: [table.coffeeId],
      foreignColumns: [coffee.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    foreignKey({
      name: 'notificationInviteIdFk',
      columns: [table.inviteId],
      foreignColumns: [invite.id],
    }).onDelete('cascade'),
  ],
)

export const notificationEmail = pgTable(
  'notificationEmail',
  {
    userId: text().notNull(),
    kind: notificationKind().notNull(),
  },
  table => [
    primaryKey({
      name: 'notificationEmailPk',
      columns: [table.userId, table.kind],
    }),
    foreignKey({
      name: 'notificationEmailUserIdFk',
      columns: [table.userId],
      foreignColumns: [user.id],
    }).onDelete('cascade'),
  ],
)
