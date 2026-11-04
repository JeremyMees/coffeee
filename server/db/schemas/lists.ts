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
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core'
import { user } from './auth.schema'
import { coffee } from './catalog.schema'

function requiredId() {
  return text().notNull()
}

export function sharedListColumns() {
  return {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text().notNull(),
    nameKey: text().notNull(),
    createdBy: text(),
    createdAt: timestamp().notNull().defaultNow(),
  }
}

export function createdByFk(list: string, createdBy: PgColumn) {
  return foreignKey({
    name: `${list}CreatedByFk`,
    columns: [createdBy],
    foreignColumns: [user.id],
  }).onDelete('set null')
}

export function sharedList<Name extends string>(name: Name) {
  return pgTable(name, sharedListColumns(), table => [
    unique(`${name}NameKeyUnique`).on(table.nameKey),
    createdByFk(name, table.createdBy),
  ])
}

export function coffeeLink<Name extends string, Entry extends string>(
  name: Name,
  entry: Entry,
  list: PgTable & { id: PgColumn },
) {
  const entryId = `${entry}Id` as const
  const entryColumn = { [entryId]: requiredId() } as Record<
    `${Entry}Id`,
    ReturnType<typeof requiredId>
  >

  return pgTable(
    name,
    {
      coffeeId: requiredId(),
      ...entryColumn,
      position: integer().notNull(),
    },
    table => {
      const linked = table[entryId] as PgColumn

      return [
        primaryKey({ name: `${name}Pk`, columns: [table.coffeeId, linked] }),
        foreignKey({
          name: `${name}CoffeeIdFk`,
          columns: [table.coffeeId],
          foreignColumns: [coffee.id],
        })
          .onDelete('cascade')
          .onUpdate('cascade'),
        foreignKey({
          name: `${name}${capitalised(entryId)}Fk`,
          columns: [linked],
          foreignColumns: [list.id],
        }),
        index(`${name}${capitalised(entryId)}Idx`).on(linked),
      ]
    },
  )
}

function capitalised(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
