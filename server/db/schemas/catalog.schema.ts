import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'
import { roastedForOptions, roastLevels } from '../../../shared/utils/coffee'
import { user } from './auth.schema'

export const roastLevel = pgEnum('roastLevel', roastLevels)
export const roastedFor = pgEnum('roastedFor', roastedForOptions)

export const roaster = pgTable(
  'roaster',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text().notNull(),
    nameKey: text().notNull(),
    createdBy: text(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  table => [
    unique('roasterNameKeyUnique').on(table.nameKey),
    foreignKey({
      name: 'roasterCreatedByFk',
      columns: [table.createdBy],
      foreignColumns: [user.id],
    }).onDelete('set null'),
  ],
)

export const coffee = pgTable(
  'coffee',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    roasterId: text().notNull(),
    name: text().notNull(),
    nameKey: text().notNull(),
    roastLevel: roastLevel().notNull(),
    roastedFor: roastedFor().notNull(),
    colour: text().notNull(),
    altitudeFrom: integer(),
    altitudeTo: integer(),
    link: text(),
    createdBy: text(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  table => [
    unique('coffeeRoasterIdNameKeyUnique').on(table.roasterId, table.nameKey),
    check(
      'coffeeAltitudeRangeCheck',
      sql`(${table.altitudeFrom} is null) = (${table.altitudeTo} is null) and ${table.altitudeFrom} between 0 and ${table.altitudeTo}`,
    ),
    foreignKey({
      name: 'coffeeRoasterIdFk',
      columns: [table.roasterId],
      foreignColumns: [roaster.id],
    }),
    foreignKey({
      name: 'coffeeCreatedByFk',
      columns: [table.createdBy],
      foreignColumns: [user.id],
    }).onDelete('set null'),
  ],
)
