import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { z } from 'zod'
import type { AdminEntrySearch, AdminList } from '#shared/types/admin'
import type { CoffeeDetails } from '#shared/types/coffee'
import type { NewGrinder } from '#shared/types/grinders'
import type { RoasterDetails } from '#shared/types/roasters'
import { adminListForm } from '#shared/utils/admin'
import { nameKey } from '#shared/utils/names'
import {
  coffeeDetailsSchema,
  entryNameSchema,
  newBrewMethodSchema,
  newGrinderSchema,
  newOriginEntrySchema,
  roasterDetailsSchema,
} from '#shared/utils/schemas'
import type { Database } from '#server/types/database'
import type { AdminListTable } from '#server/types/admin-lists'
import type { SharedList } from '#server/types/lists'
import type { EntryChanges } from '#server/types/merges'
import {
  brewMethod,
  coffee,
  grinder,
  grinderBrand,
  grindSetting,
  purchase,
  roaster,
  shelfGrinder,
} from '#server/db/schemas'
import {
  addCatalogCoffee,
  changeCatalog,
  findOrCreateRoaster,
  findTakenName,
} from '#server/utils/catalog-entries'
import { removeCoffee } from '#server/utils/coffees'
import { descriptionAdminLists } from '#server/utils/descriptions'
import { findOrCreateEntry } from '#server/utils/lists'
import { addBrewMethod } from '#server/utils/brew-methods'
import {
  mergeBrewMethods,
  mergeCoffees,
  mergeGrinderBrands,
  mergeGrinders,
  mergeRoasters,
} from '#server/utils/merges'

function counted(from: SQL) {
  return sql<number>`(select cast(count(*) as integer) ${from})`
}

const noDetail = sql<string | null>`null`

async function removeUnused(
  db: Database,
  table: SharedList,
  entryId: string,
  used: SQL<boolean>,
) {
  const [current] = await db
    .select({ inUse: used })
    .from(table)
    .where(eq(table.id, entryId))

  if (current!.inUse) return { outcome: 'inUse' as const }

  await db.delete(table).where(eq(table.id, entryId))

  return { outcome: 'deleted' as const }
}

const adminListTables: Record<AdminList, AdminListTable> = {
  coffees: {
    table: coffee,
    scope: coffee.roasterId,
    detail: sql<
      string | null
    >`(select ${roaster.name} from ${roaster} where ${roaster.id} = ${coffee.roasterId})`,
    uses: counted(
      sql`from ${purchase} where ${purchase.coffeeId} = ${coffee.id}`,
    ),
    merge: mergeCoffees,
    remove: async (db, entryId, dropPhoto) => {
      const [current] = await db
        .select({ photoUrl: coffee.photoUrl })
        .from(coffee)
        .where(eq(coffee.id, entryId))

      await removeCoffee(db, entryId)
      dropPhoto(current!.photoUrl)

      return { outcome: 'deleted' }
    },
  },
  roasters: {
    table: roaster,
    detail: noDetail,
    uses: counted(
      sql`from ${coffee} where ${coffee.roasterId} = ${roaster.id}`,
    ),
    merge: mergeRoasters,
    remove: async (db, entryId, dropPhoto) => {
      const [current] = await db
        .select({ logoUrl: roaster.logoUrl })
        .from(roaster)
        .where(eq(roaster.id, entryId))
      const removed = await removeUnused(
        db,
        roaster,
        entryId,
        sql<boolean>`exists (select 1 from ${coffee} where ${coffee.roasterId} = ${entryId})`,
      )

      if (removed.outcome === 'deleted') dropPhoto(current!.logoUrl)

      return removed
    },
  },
  ...descriptionAdminLists,
  grinders: {
    table: grinder,
    scope: grinder.brandId,
    detail: sql<
      string | null
    >`(select ${grinderBrand.name} from ${grinderBrand} where ${grinderBrand.id} = ${grinder.brandId})`,
    uses: counted(
      sql`from ${shelfGrinder} where ${shelfGrinder.grinderId} = ${grinder.id}`,
    ),
    merge: mergeGrinders,
    remove: (db, entryId) =>
      removeUnused(
        db,
        grinder,
        entryId,
        sql<boolean>`exists (select 1 from ${shelfGrinder} where ${shelfGrinder.grinderId} = ${entryId})
          or exists (select 1 from ${grindSetting} where ${grindSetting.grinderId} = ${entryId})`,
      ),
  },
  grinderBrands: {
    table: grinderBrand,
    detail: noDetail,
    uses: counted(
      sql`from ${grinder} where ${grinder.brandId} = ${grinderBrand.id}`,
    ),
    merge: mergeGrinderBrands,
    remove: (db, entryId) =>
      removeUnused(
        db,
        grinderBrand,
        entryId,
        sql<boolean>`exists (select 1 from ${grinder} where ${grinder.brandId} = ${entryId})`,
      ),
  },
  brewMethods: {
    table: brewMethod,
    detail: noDetail,
    uses: counted(
      sql`from ${grindSetting} where ${grindSetting.brewMethodId} = ${brewMethod.id}`,
    ),
    merge: mergeBrewMethods,
    remove: (db, entryId) =>
      removeUnused(
        db,
        brewMethod,
        entryId,
        sql<boolean>`exists (select 1 from ${grindSetting} where ${grindSetting.brewMethodId} = ${entryId})`,
      ),
  },
}

export async function listAdminEntries(
  db: Database,
  input: { list: AdminList; search: AdminEntrySearch },
) {
  const { table, scope, mergesWithinScope, detail, uses } =
    adminListTables[input.list]
  const { search } = input
  const key = nameKey(search.search)
  const sameScope =
    search.except && mergesWithinScope && scope
      ? inArray(
          scope,
          db.select({ scope }).from(table).where(eq(table.id, search.except)),
        )
      : undefined

  const rows = await db
    .select({
      id: sql<string>`${table.id}`,
      name: sql<string>`${table.name}`,
      detail,
      detailId: scope ? sql<string | null>`${scope}` : sql<null>`null`,
      uses,
      total: sql<number>`cast(count(*) over () as integer)`,
    })
    .from(table)
    .where(
      and(
        key ? sql`strpos(${table.nameKey}, ${key}) > 0` : undefined,
        search.except ? ne(table.id, search.except) : undefined,
        sameScope,
      ),
    )
    .orderBy(asc(table.nameKey), asc(table.id))
    .limit(search.pageSize)
    .offset(search.page * search.pageSize)

  return {
    total: rows[0]?.total ?? 0,
    entries: rows.map(({ total: _total, ...row }) => row),
  }
}

async function findEntries(
  db: Database,
  definition: AdminListTable,
  entryIds: string[],
) {
  const { table, scope } = definition

  return db
    .select({
      id: sql<string>`${table.id}`,
      name: sql<string>`${table.name}`,
      scope: scope ? sql<string>`${scope}` : sql<null>`null`,
    })
    .from(table)
    .where(inArray(table.id, entryIds))
}

export function adminEntryChangesSchema(list: AdminList) {
  if (list === 'grinders') return newGrinderSchema

  return adminListForm(list) === 'origin'
    ? newOriginEntrySchema
    : entryNameSchema
}

export function updateAdminEntry(
  db: Database,
  input: {
    list: AdminList
    entryId: string
    userId: string
    changes: EntryChanges
  },
) {
  const definition = adminListTables[input.list]
  const { table, scope, uses } = definition
  const { changes } = input

  return db.transaction(async tx => {
    const [current] = await findEntries(tx, definition, [input.entryId])

    if (!current) return { outcome: 'notFound' as const }

    let scoped = current.scope

    if (changes.brand !== undefined) {
      scoped = await findOrCreateEntry(tx, grinderBrand, {
        name: changes.brand,
        createdBy: input.userId,
      })
    }

    if (changes.originCode !== undefined && changes.originCode !== scoped) {
      const [used] = await tx
        .select({ uses })
        .from(table)
        .where(eq(table.id, input.entryId))

      if (used!.uses > 0) return { outcome: 'inUse' as const }

      scoped = changes.originCode
    }

    const taken = await findTakenName(tx, table, {
      name: changes.name,
      except: input.entryId,
      scope: scope && { column: scope, value: scoped },
    })

    if (taken) return { outcome: 'taken' as const, taken }

    await tx
      .update(table)
      .set({
        name: changes.name,
        nameKey: nameKey(changes.name),
        ...(scope && { [scope.name]: scoped }),
      } as never)
      .where(eq(table.id, input.entryId))

    return {
      outcome: 'updated' as const,
      entry: { id: input.entryId, name: changes.name },
    }
  })
}

export async function mergeAdminEntry(
  db: Database,
  input: { list: AdminList; entryId: string; intoId: string },
) {
  if (input.entryId === input.intoId) return { outcome: 'same' as const }

  const definition = adminListTables[input.list]

  return changeCatalog(db, async (tx, dropPhoto) => {
    const found = await findEntries(tx, definition, [
      input.entryId,
      input.intoId,
    ])
    const from = found.find(entry => entry.id === input.entryId)
    const into = found.find(entry => entry.id === input.intoId)

    if (!from || !into) return { outcome: 'notFound' as const }

    if (definition.mergesWithinScope && from.scope !== into.scope) {
      return { outcome: 'otherScope' as const }
    }

    await definition.merge(
      tx,
      { from: input.entryId, to: input.intoId },
      dropPhoto,
    )

    return {
      outcome: 'merged' as const,
      entry: { id: into.id, name: into.name },
    }
  })
}

export function deleteAdminEntry(
  db: Database,
  input: { list: AdminList; entryId: string },
) {
  const definition = adminListTables[input.list]

  return changeCatalog(db, async (tx, dropPhoto) => {
    const [current] = await findEntries(tx, definition, [input.entryId])

    if (!current) return { outcome: 'notFound' as const }

    return definition.remove(tx, input.entryId, dropPhoto)
  })
}

type Addition =
  | { outcome: 'added'; entry: { id: string; name: string } }
  | { outcome: 'taken'; field: string; message: string }

interface AdminListAdder {
  schema: z.ZodType
  add: (db: Database, body: never, createdBy: string) => Promise<Addition>
}

function taken(field: string, name: string): Addition {
  return {
    outcome: 'taken',
    field,
    message: `${name} is already on the list`,
  }
}

async function insertEntry(
  db: Database,
  table: SharedList,
  entry: { name: string; createdBy: string } & Record<string, unknown>,
): Promise<Addition> {
  const [added] = await db
    .insert(table)
    .values({ ...entry, nameKey: nameKey(entry.name) } as never)
    .onConflictDoNothing()
    .returning({ id: table.id, name: table.name })

  return added
    ? { outcome: 'added', entry: added as { id: string; name: string } }
    : taken('name', entry.name)
}

async function insertRoaster(
  db: Database,
  details: RoasterDetails & { createdBy: string },
): Promise<Addition> {
  const added = await findOrCreateRoaster(db, details)

  return added.created
    ? { outcome: 'added', entry: added.roaster }
    : taken('name', details.name)
}

function namedAdder(table: SharedList): AdminListAdder {
  return {
    schema: entryNameSchema,
    add: (db, body: { name: string }, createdBy) =>
      insertEntry(db, table, { name: body.name, createdBy }),
  }
}

function originAdder(table: SharedList): AdminListAdder {
  return {
    schema: newOriginEntrySchema,
    add: (db, body: { name: string; originCode: string }, createdBy) =>
      insertEntry(db, table, { ...body, createdBy }),
  }
}

const adminListAdders: Record<AdminList, AdminListAdder> = {
  coffees: {
    schema: coffeeDetailsSchema,
    add: (db, details: CoffeeDetails, createdBy) =>
      db.transaction(async tx => {
        const { coffee: found, created } = await addCatalogCoffee(tx, {
          userId: createdBy,
          details,
          whenFound: 'keep',
        })

        if (!created) {
          return taken('name', `${found.roaster} ${found.name}`)
        }

        return {
          outcome: 'added' as const,
          entry: { id: found.id, name: found.name },
        }
      }),
  },
  roasters: {
    schema: roasterDetailsSchema,
    add: (db, details: RoasterDetails, createdBy) =>
      insertRoaster(db, { ...details, createdBy }),
  },
  flavorNotes: namedAdder(descriptionAdminLists.flavorNotes.table),
  regions: originAdder(descriptionAdminLists.regions.table),
  producers: namedAdder(descriptionAdminLists.producers.table),
  farms: originAdder(descriptionAdminLists.farms.table),
  washingStations: originAdder(descriptionAdminLists.washingStations.table),
  processes: namedAdder(descriptionAdminLists.processes.table),
  varietals: namedAdder(descriptionAdminLists.varietals.table),
  grinders: {
    schema: newGrinderSchema,
    add: (db, input: NewGrinder, createdBy) =>
      db.transaction(async tx => {
        const brandId = await findOrCreateEntry(tx, grinderBrand, {
          name: input.brand,
          createdBy,
        })
        const [added] = await tx
          .insert(grinder)
          .values({
            brandId,
            name: input.model,
            nameKey: nameKey(input.model),
            createdBy,
          })
          .onConflictDoNothing()
          .returning({ id: grinder.id, name: grinder.name })

        return added
          ? { outcome: 'added' as const, entry: added }
          : taken('model', `${input.brand} ${input.model}`)
      }),
  },
  grinderBrands: namedAdder(grinderBrand),
  brewMethods: {
    schema: newBrewMethodSchema,
    add: async (db, body: { name: string }, createdBy) => {
      const added = await addBrewMethod(db, { createdBy, brewMethod: body })

      return added
        ? { outcome: 'added' as const, entry: added }
        : taken('name', body.name)
    },
  },
}

export function adminEntrySchema(list: AdminList) {
  return adminListAdders[list].schema
}

export function addAdminEntry(
  db: Database,
  input: { list: AdminList; body: unknown; createdBy: string },
) {
  return adminListAdders[input.list].add(
    db,
    input.body as never,
    input.createdBy,
  )
}
