import {
  foreignKey,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { newCode } from '../../../shared/utils/slugs'
import { user } from './auth.schema'

export const shelf = pgTable(
  'shelf',
  {
    id: text().primaryKey().$defaultFn(newCode),
    name: text().notNull(),
    ownerId: text().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  table => [
    index('shelfOwnerIdIdx').on(table.ownerId),
    foreignKey({
      name: 'shelfOwnerIdFk',
      columns: [table.ownerId],
      foreignColumns: [user.id],
    }),
  ],
)

export const shelfMember = pgTable(
  'shelfMember',
  {
    shelfId: text().notNull(),
    userId: text().notNull(),
    joinedAt: timestamp().notNull().defaultNow(),
  },
  table => [
    primaryKey({
      name: 'shelfMemberPk',
      columns: [table.shelfId, table.userId],
    }),
    index('shelfMemberUserIdIdx').on(table.userId),
    foreignKey({
      name: 'shelfMemberShelfIdFk',
      columns: [table.shelfId],
      foreignColumns: [shelf.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    foreignKey({
      name: 'shelfMemberUserIdFk',
      columns: [table.userId],
      foreignColumns: [user.id],
    }).onDelete('cascade'),
  ],
)
