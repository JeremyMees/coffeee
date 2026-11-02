import {
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'
import { user } from './auth.schema'
import { coffee } from './catalog.schema'

export const origin = pgTable('origin', {
  code: text().primaryKey(),
  name: text().notNull(),
})

export const region = pgTable(
  'region',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    originCode: text().notNull(),
    name: text().notNull(),
    nameKey: text().notNull(),
    createdBy: text(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  table => [
    unique('regionOriginCodeNameKeyUnique').on(table.originCode, table.nameKey),
    foreignKey({
      name: 'regionOriginCodeFk',
      columns: [table.originCode],
      foreignColumns: [origin.code],
    }),
    foreignKey({
      name: 'regionCreatedByFk',
      columns: [table.createdBy],
      foreignColumns: [user.id],
    }).onDelete('set null'),
  ],
)

export const coffeeOrigin = pgTable(
  'coffeeOrigin',
  {
    coffeeId: text().notNull(),
    originCode: text().notNull(),
    position: integer().notNull(),
  },
  table => [
    primaryKey({
      name: 'coffeeOriginPk',
      columns: [table.coffeeId, table.originCode],
    }),
    foreignKey({
      name: 'coffeeOriginCoffeeIdFk',
      columns: [table.coffeeId],
      foreignColumns: [coffee.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'coffeeOriginOriginCodeFk',
      columns: [table.originCode],
      foreignColumns: [origin.code],
    }),
    index('coffeeOriginOriginCodeIdx').on(table.originCode),
  ],
)

export const coffeeRegion = pgTable(
  'coffeeRegion',
  {
    coffeeId: text().notNull(),
    regionId: text().notNull(),
    position: integer().notNull(),
  },
  table => [
    primaryKey({
      name: 'coffeeRegionPk',
      columns: [table.coffeeId, table.regionId],
    }),
    foreignKey({
      name: 'coffeeRegionCoffeeIdFk',
      columns: [table.coffeeId],
      foreignColumns: [coffee.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'coffeeRegionRegionIdFk',
      columns: [table.regionId],
      foreignColumns: [region.id],
    }),
    index('coffeeRegionRegionIdIdx').on(table.regionId),
  ],
)
