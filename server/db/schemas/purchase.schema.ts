import {
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { user } from './auth.schema'
import { coffee } from './catalog.schema'
import { shelf } from './shelf.schema'

export const purchase = pgTable(
  'purchase',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    shelfId: text().notNull(),
    coffeeId: text().notNull(),
    purchasedOn: date().notNull(),
    roastedOn: date(),
    sizeGrams: integer(),
    priceCents: integer(),
    finishedAt: timestamp(),
    addedBy: text(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  table => [
    index('purchaseShelfIdCoffeeIdIdx').on(table.shelfId, table.coffeeId),
    index('purchaseCoffeeIdIdx').on(table.coffeeId),
    foreignKey({
      name: 'purchaseShelfIdFk',
      columns: [table.shelfId],
      foreignColumns: [shelf.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    foreignKey({
      name: 'purchaseCoffeeIdFk',
      columns: [table.coffeeId],
      foreignColumns: [coffee.id],
    }).onUpdate('cascade'),
    foreignKey({
      name: 'purchaseAddedByFk',
      columns: [table.addedBy],
      foreignColumns: [user.id],
    }).onDelete('set null'),
  ],
)
