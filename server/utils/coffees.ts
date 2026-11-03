import { and, asc, desc, eq, inArray, isNull, max, ne } from 'drizzle-orm'
import { coffeeListFields } from '#shared/utils/coffee'
import type { ListEntry } from '#shared/types/catalog'
import type {
  CoffeeDescription,
  CoffeeDetails,
  CoffeeListField,
  NewCoffee,
} from '#shared/types/coffee'
import { nameKey } from '#shared/utils/names'
import type { Database } from '#server/types/database'
import {
  coffee,
  coffeeFlavorNote,
  coffeeProcess,
  coffeeProducer,
  coffeeVarietal,
  coffeeVerdict,
  flavorNote,
  processList,
  producer,
  purchase,
  roaster,
  varietal,
} from '#server/db/schemas'
import {
  describeEntries,
  entriesOf,
  findOrCreateEntry,
} from '#server/utils/lists'
import type { Viewer } from '#server/types/coffees'
import { canEditCatalogEntry } from '#server/utils/catalog'
import type { CoffeeList } from '#server/types/lists'
import type { EditableCoffeePhoto } from '#server/types/photos'
import { describeOrigins, originsOf } from '#server/utils/origins'
import { deletePhoto } from '#server/utils/photos'
import {
  grindSettingsOf,
  otherGrindSettingsOf,
} from '#server/utils/grind-settings'
import { addPurchase, purchaseColumns } from '#server/utils/purchases'
import { findRoaster } from '#server/utils/roasters'
import { shelvesHolding } from '#server/utils/shelves'
import {
  findVerdict,
  memberVerdictsOf,
  verdictOn,
} from '#server/utils/verdicts'

export const coffeeColumns = {
  id: coffee.id,
  name: coffee.name,
  roaster: roaster.name,
  roastLevel: coffee.roastLevel,
  roastedFor: coffee.roastedFor,
  colour: coffee.colour,
  photoUrl: coffee.photoUrl,
}

const detailColumns = {
  ...coffeeColumns,
  altitudeFrom: coffee.altitudeFrom,
  altitudeTo: coffee.altitudeTo,
  link: coffee.link,
}

const coffeeLists: Record<CoffeeListField, CoffeeList> = {
  producers: {
    list: producer,
    link: coffeeProducer,
    entryId: coffeeProducer.producerId,
  },
  processes: {
    list: processList,
    link: coffeeProcess,
    entryId: coffeeProcess.processId,
  },
  varietals: {
    list: varietal,
    link: coffeeVarietal,
    entryId: coffeeVarietal.varietalId,
  },
  flavorNotes: {
    list: flavorNote,
    link: coffeeFlavorNote,
    entryId: coffeeFlavorNote.flavorNoteId,
  },
}

export async function describeCoffee(
  db: Database,
  input: { coffeeId: string; userId: string; details: CoffeeDescription },
) {
  await describeOrigins(db, input)

  for (const field of coffeeListFields) {
    await describeEntries(db, coffeeLists[field], {
      coffeeId: input.coffeeId,
      userId: input.userId,
      entries: input.details[field].map(name => ({ name })),
    })
  }
}

async function describedOf(db: Database, coffeeId: string) {
  const entries = {} as Record<CoffeeListField, ListEntry[]>

  for (const field of coffeeListFields) {
    entries[field] = await entriesOf(db, coffeeLists[field], coffeeId)
  }

  return { ...(await originsOf(db, coffeeId)), ...entries }
}

export async function flavorNotesOf(db: Database, coffeeIds: string[]) {
  const notes = new Map<string, ListEntry[]>()

  if (!coffeeIds.length) return notes

  const linked = await db
    .select({
      coffeeId: coffeeFlavorNote.coffeeId,
      id: flavorNote.id,
      name: flavorNote.name,
    })
    .from(coffeeFlavorNote)
    .innerJoin(flavorNote, eq(flavorNote.id, coffeeFlavorNote.flavorNoteId))
    .where(inArray(coffeeFlavorNote.coffeeId, coffeeIds))
    .orderBy(asc(coffeeFlavorNote.position))

  for (const { coffeeId, ...note } of linked) {
    notes.set(coffeeId, [...(notes.get(coffeeId) ?? []), note])
  }

  return notes
}

export async function findOrCreateCoffee(
  db: Database,
  input: Omit<typeof coffee.$inferInsert, 'nameKey'>,
) {
  const key = nameKey(input.name)

  const [created] = await db
    .insert(coffee)
    .values({ ...input, nameKey: key })
    .onConflictDoNothing({ target: [coffee.roasterId, coffee.nameKey] })
    .returning({ id: coffee.id })

  const [found] = await db
    .select(coffeeColumns)
    .from(coffee)
    .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
    .where(and(eq(coffee.roasterId, input.roasterId), eq(coffee.nameKey, key)))

  return { coffee: found!, created: created !== undefined }
}

export function addCoffee(
  db: Database,
  input: { shelfId: string; userId: string; coffee: NewCoffee },
) {
  const details = input.coffee

  return db.transaction(async tx => {
    const roasterId = await findOrCreateEntry(tx, roaster, {
      name: details.roaster,
      createdBy: input.userId,
    })
    const { coffee: found, created } = await findOrCreateCoffee(tx, {
      roasterId,
      name: details.name,
      roastLevel: details.roastLevel,
      roastedFor: details.roastedFor,
      colour: details.colour,
      altitudeFrom: details.altitudeFrom,
      altitudeTo: details.altitudeTo,
      link: details.link,
      createdBy: input.userId,
    })

    if (created) {
      await describeCoffee(tx, {
        coffeeId: found.id,
        userId: input.userId,
        details,
      })
    }
    const added = await addPurchase(tx, {
      shelfId: input.shelfId,
      coffeeId: found.id,
      userId: input.userId,
      purchase: details,
    })

    return { coffee: found, purchase: { id: added.id } }
  })
}

export async function listStock(
  db: Database,
  input: { shelfId: string; userId: string },
) {
  const stock = await db
    .select({
      ...coffeeColumns,
      roastedOn: max(purchase.roastedOn),
      rating: coffeeVerdict.rating,
    })
    .from(purchase)
    .innerJoin(coffee, eq(coffee.id, purchase.coffeeId))
    .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
    .leftJoin(coffeeVerdict, verdictOn(input.userId))
    .where(
      and(eq(purchase.shelfId, input.shelfId), isNull(purchase.finishedAt)),
    )
    .groupBy(coffee.id, roaster.id, coffeeVerdict.rating)
    .orderBy(desc(max(purchase.purchasedOn)), desc(max(purchase.createdAt)))
  const notes = await flavorNotesOf(
    db,
    stock.map(row => row.id),
  )

  return stock.map(row => ({ ...row, flavorNotes: notes.get(row.id) ?? [] }))
}

export async function findEditableCoffee(
  db: Database,
  input: { coffeeId: string; editor: Viewer },
) {
  const [current] = await db
    .select({ createdBy: coffee.createdBy, photoUrl: coffee.photoUrl })
    .from(coffee)
    .where(eq(coffee.id, input.coffeeId))

  if (!current) return { outcome: 'notFound' as const }

  if (!canEditCatalogEntry(input.editor, current.createdBy)) {
    return { outcome: 'forbidden' as const }
  }

  return { outcome: 'editable' as const, photoUrl: current.photoUrl }
}

export async function replaceCoffeePhoto(
  db: Database,
  current: EditableCoffeePhoto,
  photoUrl: string | null,
) {
  await db
    .update(coffee)
    .set({ photoUrl })
    .where(eq(coffee.id, current.coffeeId))
  await deletePhoto(current.photoUrl)

  return { photoUrl }
}

async function findCatalogCoffee(
  db: Database,
  input: { coffeeId: string; viewer: Viewer },
) {
  const [found] = await db
    .select({
      ...detailColumns,
      roasterId: coffee.roasterId,
      createdBy: coffee.createdBy,
    })
    .from(coffee)
    .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
    .where(eq(coffee.id, input.coffeeId))

  if (!found) return undefined

  const { roasterId, createdBy, ...details } = found

  return {
    ...details,
    ...(await describedOf(db, input.coffeeId)),
    ...(await findVerdict(db, {
      userId: input.viewer.id,
      coffeeId: input.coffeeId,
    })),
    canEdit: canEditCatalogEntry(input.viewer, createdBy),
    roasterDetails: (await findRoaster(db, {
      roasterId,
      viewer: input.viewer,
    }))!,
  }
}

export async function findCoffee(
  db: Database,
  input: { coffeeId: string; viewer: Viewer },
) {
  const found = await findCatalogCoffee(db, input)

  if (!found) return undefined

  return {
    ...found,
    shelves: await shelvesHolding(db, {
      coffeeId: input.coffeeId,
      userId: input.viewer.id,
    }),
  }
}

export async function findShelfCoffee(
  db: Database,
  input: { shelfId: string; coffeeId: string; viewer: Viewer },
) {
  const found = await findCatalogCoffee(db, input)

  if (!found) return undefined

  const purchases = await db
    .select(purchaseColumns)
    .from(purchase)
    .where(
      and(
        eq(purchase.shelfId, input.shelfId),
        eq(purchase.coffeeId, input.coffeeId),
      ),
    )
    .orderBy(desc(purchase.purchasedOn), desc(purchase.createdAt))

  return {
    ...found,
    memberVerdicts: await memberVerdictsOf(db, {
      shelfId: input.shelfId,
      coffeeId: input.coffeeId,
      userId: input.viewer.id,
    }),
    purchases,
    grindSettings: await grindSettingsOf(db, {
      userId: input.viewer.id,
      coffeeId: input.coffeeId,
    }),
    otherGrindSettings: await otherGrindSettingsOf(db, {
      shelfId: input.shelfId,
      userId: input.viewer.id,
      coffeeId: input.coffeeId,
    }),
  }
}

export function editCoffee(
  db: Database,
  input: { coffeeId: string; editor: Viewer; details: CoffeeDetails },
) {
  const { details } = input

  return db.transaction(async tx => {
    const current = await findEditableCoffee(tx, input)

    if (current.outcome !== 'editable') return current

    const roasterId = await findOrCreateEntry(tx, roaster, {
      name: details.roaster,
      createdBy: input.editor.id,
    })
    const key = nameKey(details.name)
    const [taken] = await tx
      .select({ roaster: roaster.name, name: coffee.name })
      .from(coffee)
      .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
      .where(
        and(
          eq(coffee.roasterId, roasterId),
          eq(coffee.nameKey, key),
          ne(coffee.id, input.coffeeId),
        ),
      )

    if (taken) return { outcome: 'taken' as const, taken }

    await tx
      .update(coffee)
      .set({
        roasterId,
        name: details.name,
        nameKey: key,
        roastLevel: details.roastLevel,
        roastedFor: details.roastedFor,
        colour: details.colour,
        altitudeFrom: details.altitudeFrom,
        altitudeTo: details.altitudeTo,
        link: details.link,
      })
      .where(eq(coffee.id, input.coffeeId))

    await describeCoffee(tx, {
      coffeeId: input.coffeeId,
      userId: input.editor.id,
      details,
    })

    const [edited] = await tx
      .select(detailColumns)
      .from(coffee)
      .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
      .where(eq(coffee.id, input.coffeeId))

    return {
      outcome: 'edited' as const,
      coffee: { ...edited!, ...(await describedOf(tx, input.coffeeId)) },
    }
  })
}
