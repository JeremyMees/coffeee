import {
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { user } from './auth.schema'

export const pushSubscription = pgTable(
  'pushSubscription',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text().notNull(),
    endpoint: text().notNull().unique('pushSubscriptionEndpointUnique'),
    p256dh: text().notNull(),
    auth: text().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  table => [
    index('pushSubscriptionUserIdIdx').on(table.userId),
    foreignKey({
      name: 'pushSubscriptionUserIdFk',
      columns: [table.userId],
      foreignColumns: [user.id],
    }).onDelete('cascade'),
  ],
)
