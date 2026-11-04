import {
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  unique,
} from 'drizzle-orm/pg-core'
import { coffee, origin } from './catalog.schema'
import { coffeeLink, createdByFk, sharedListColumns } from './lists'

function originList<Name extends string>(name: Name) {
  return pgTable(
    name,
    { ...sharedListColumns(), originCode: text().notNull() },
    table => [
      unique(`${name}OriginCodeNameKeyUnique`).on(
        table.originCode,
        table.nameKey,
      ),
      foreignKey({
        name: `${name}OriginCodeFk`,
        columns: [table.originCode],
        foreignColumns: [origin.code],
      }),
      createdByFk(name, table.createdBy),
    ],
  )
}

export const region = originList('region')
export const farm = originList('farm')
export const washingStation = originList('washingStation')

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
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    foreignKey({
      name: 'coffeeOriginOriginCodeFk',
      columns: [table.originCode],
      foreignColumns: [origin.code],
    }),
    index('coffeeOriginOriginCodeIdx').on(table.originCode),
  ],
)

export const coffeeRegion = coffeeLink('coffeeRegion', 'region', region)
export const coffeeFarm = coffeeLink('coffeeFarm', 'farm', farm)
export const coffeeWashingStation = coffeeLink(
  'coffeeWashingStation',
  'washingStation',
  washingStation,
)
