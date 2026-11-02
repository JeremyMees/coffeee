import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { user } from './auth.schema'

export const invite = pgTable(
  'invite',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text(),
    tokenHash: text().unique('inviteTokenHashUnique'),
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
    check(
      'inviteEmailOrLink',
      sql`(${table.email} is null) <> (${table.tokenHash} is null)`,
    ),
    uniqueIndex('invitePendingEmailIdx')
      .on(table.email)
      .where(sql`${table.usedAt} is null`),
  ],
)
