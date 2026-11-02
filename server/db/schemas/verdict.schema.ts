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
import { shelf } from './shelf.schema'

export const coffeeVerdict = pgTable(
  'coffeeVerdict',
  {
    shelfId: text().notNull(),
    coffeeId: text().notNull(),
    rating: smallint(),
    wouldBuyAgain: boolean().notNull().default(false),
    updatedBy: text(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  table => [
    primaryKey({
      name: 'coffeeVerdictPk',
      columns: [table.shelfId, table.coffeeId],
    }),
    index('coffeeVerdictCoffeeIdIdx').on(table.coffeeId),
    check('coffeeVerdictRatingCheck', sql`${table.rating} between 1 and 5`),
    foreignKey({
      name: 'coffeeVerdictShelfIdFk',
      columns: [table.shelfId],
      foreignColumns: [shelf.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'coffeeVerdictCoffeeIdFk',
      columns: [table.coffeeId],
      foreignColumns: [coffee.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'coffeeVerdictUpdatedByFk',
      columns: [table.updatedBy],
      foreignColumns: [user.id],
    }).onDelete('set null'),
  ],
)
