import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { user } from './auth.schema'
import { shelf } from './shelf.schema'

export const invite = pgTable(
  'invite',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text(),
    tokenHash: text().unique('inviteTokenHashUnique'),
    shelfId: text(),
    createdBy: text().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    expiresAt: timestamp(),
    usedAt: timestamp(),
    usedBy: text(),
  },
  table => [
    foreignKey({
      name: 'inviteCreatedByFk',
      columns: [table.createdBy],
      foreignColumns: [user.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'inviteShelfIdFk',
      columns: [table.shelfId],
      foreignColumns: [shelf.id],
    }).onDelete('cascade'),
    index('inviteShelfIdIdx').on(table.shelfId),
    check(
      'inviteEmailOrLink',
      sql`(${table.email} is not null or ${table.tokenHash} is not null) and (${table.shelfId} is null or (${table.email} is not null and ${table.tokenHash} is not null))`,
    ),
    uniqueIndex('invitePendingEmailIdx')
      .on(table.email, sql`coalesce(${table.shelfId}, '')`)
      .where(sql`${table.usedAt} is null`),
  ],
)
