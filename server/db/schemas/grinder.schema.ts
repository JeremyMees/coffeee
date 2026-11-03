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
import { createdByFk, sharedList, sharedListColumns } from './lists'
import { shelf } from './shelf.schema'

export const grinderBrand = sharedList('grinderBrand')

export const grinder = pgTable(
  'grinder',
  { ...sharedListColumns(), brandId: text().notNull() },
  table => [
    unique('grinderBrandIdNameKeyUnique').on(table.brandId, table.nameKey),
    foreignKey({
      name: 'grinderBrandIdFk',
      columns: [table.brandId],
      foreignColumns: [grinderBrand.id],
    }),
    createdByFk('grinder', table.createdBy),
  ],
)

export const brewMethod = pgTable(
  'brewMethod',
  { ...sharedListColumns(), position: integer().notNull() },
  table => [
    unique('brewMethodNameKeyUnique').on(table.nameKey),
    createdByFk('brewMethod', table.createdBy),
  ],
)

export const shelfGrinder = pgTable(
  'shelfGrinder',
  {
    shelfId: text().notNull(),
    grinderId: text().notNull(),
    addedAt: timestamp().notNull().defaultNow(),
  },
  table => [
    primaryKey({
      name: 'shelfGrinderPk',
      columns: [table.shelfId, table.grinderId],
    }),
    index('shelfGrinderGrinderIdIdx').on(table.grinderId),
    foreignKey({
      name: 'shelfGrinderShelfIdFk',
      columns: [table.shelfId],
      foreignColumns: [shelf.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'shelfGrinderGrinderIdFk',
      columns: [table.grinderId],
      foreignColumns: [grinder.id],
    }).onDelete('cascade'),
  ],
)

export const grindSetting = pgTable(
  'grindSetting',
  {
    userId: text().notNull(),
    coffeeId: text().notNull(),
    grinderId: text().notNull(),
    brewMethodId: text().notNull(),
    setting: text().notNull(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  table => [
    primaryKey({
      name: 'grindSettingPk',
      columns: [
        table.userId,
        table.coffeeId,
        table.grinderId,
        table.brewMethodId,
      ],
    }),
    index('grindSettingCoffeeIdIdx').on(table.coffeeId),
    index('grindSettingGrinderIdIdx').on(table.grinderId),
    index('grindSettingBrewMethodIdIdx').on(table.brewMethodId),
    foreignKey({
      name: 'grindSettingUserIdFk',
      columns: [table.userId],
      foreignColumns: [user.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'grindSettingCoffeeIdFk',
      columns: [table.coffeeId],
      foreignColumns: [coffee.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'grindSettingGrinderIdFk',
      columns: [table.grinderId],
      foreignColumns: [grinder.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'grindSettingBrewMethodIdFk',
      columns: [table.brewMethodId],
      foreignColumns: [brewMethod.id],
    }).onDelete('cascade'),
  ],
)
