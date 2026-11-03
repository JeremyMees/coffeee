import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  index,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { user } from './auth.schema'
import { coffee } from './catalog.schema'

export const coffeeVerdict = pgTable(
  'coffeeVerdict',
  {
    userId: text().notNull(),
    coffeeId: text().notNull(),
    rating: smallint(),
    wouldBuyAgain: boolean().notNull().default(false),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  table => [
    primaryKey({
      name: 'coffeeVerdictPk',
      columns: [table.userId, table.coffeeId],
    }),
    index('coffeeVerdictCoffeeIdIdx').on(table.coffeeId),
    check('coffeeVerdictRatingCheck', sql`${table.rating} between 1 and 5`),
    foreignKey({
      name: 'coffeeVerdictUserIdFk',
      columns: [table.userId],
      foreignColumns: [user.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'coffeeVerdictCoffeeIdFk',
      columns: [table.coffeeId],
      foreignColumns: [coffee.id],
    }).onDelete('cascade'),
  ],
)
