import { and, asc, eq, sql } from 'drizzle-orm'
import type { RoastedFor } from '#shared/types/coffee'
import { roastLevelLabels } from '#shared/utils/coffee'
import { localDate } from '#shared/utils/dates'
import { nameKey } from '#shared/utils/names'
import type { OriginCode } from '#shared/types/origins'
import { originCodes, origins } from '#shared/utils/origins'
import { priceCents } from '#shared/utils/purchases'
import type { Database } from '#server/types/database'
import type {
  NotionCoffee,
  NotionImport,
  NotionPage,
} from '#server/types/notion'
import { coffee, flavorNote, purchase, shelf, user } from '#server/db/schemas'
import { addCatalogCoffee } from '#server/utils/catalog-entries'
import { ownGrinder } from '#server/utils/grinders'
import { findOrCreateEntry } from '#server/utils/lists'
import {
  firstFileUrl,
  isChecked,
  numberOf,
  plainText,
  relatedIds,
  selectedName,
  selectedNames,
} from '#server/utils/notion'
import { judgeCoffee } from '#server/utils/verdicts'

export const notionDatabases = {
  coffees: '1cff794fddba8106aaddf22b409ebc53',
  flavorNotes: '1cff794fddba81f58097e7c63e5245c0',
}

export const importedGrinders = [
  { brand: 'Fellow', model: 'Opus Gen 2' },
  { brand: 'Timemore', model: 'Chestnut C5 Pro' },
]

const droppedVarietals = new Set(['acaia', 'multiple', 'blend', 'arabica'])

const originAliases: Record<string, OriginCode> = { columbia: 'CO' }

function originCode(name: string) {
  const key = nameKey(name)
  const code =
    originAliases[key] ??
    originCodes.find(candidate => nameKey(origins[candidate]) === key)

  if (!code) throw new Error(`No origin matches "${name}"`)

  return code
}

function roastLevelOf(page: NotionPage, name: string) {
  const label = selectedName(page.properties['Roast Level'])
  const level = Object.entries(roastLevelLabels).find(
    ([, roastLevel]) => roastLevel === label,
  )?.[0]

  if (!level) throw new Error(`${name} has no roast level`)

  return level as NotionCoffee['roastLevel']
}

export function roastedForOf(link: string | null): RoastedFor {
  const lowered = link?.toLowerCase() ?? ''

  if (lowered.includes('espresso')) return 'espresso'
  if (lowered.includes('filter')) return 'filter'

  return 'omni'
}

export function readNotionCoffee(
  page: NotionPage,
  flavorNotes: Map<string, string>,
): NotionCoffee {
  const { properties } = page
  const name = plainText(properties['Coffee Name'])
  const [roasterName] = selectedNames(properties.Roaster)
  const link = plainText(properties.Link) || null
  const rating = selectedName(properties.Rating)
  const sizeGrams = numberOf(properties['Size (g / bag)'])

  if (!roasterName) throw new Error(`${name} has no roaster`)

  return {
    roaster: roasterName,
    name,
    roastLevel: roastLevelOf(page, name),
    origins: selectedNames(properties.Origin).map(originCode),
    processes: selectedNames(properties.Process),
    varietals: selectedNames(properties.Varietal).filter(
      varietal => !droppedVarietals.has(nameKey(varietal)),
    ),
    flavorNotes: relatedIds(properties['Flavor Notes']).flatMap(
      id => flavorNotes.get(id) ?? [],
    ),
    link,
    photoUrl: firstFileUrl(properties.Image),
    purchasedOn: localDate(new Date(page.created_time)),
    finishedAt:
      selectedName(properties.Inventory) === 'In-stock'
        ? null
        : new Date(page.last_edited_time),
    sizeGrams: sizeGrams === null ? null : Math.round(sizeGrams),
    price: numberOf(properties.Price),
    rating: rating ? [...rating].length : null,
    wouldBuyAgain: isChecked(properties['Would buy again?']),
  }
}

export function groupNotionCoffees(coffees: NotionCoffee[]) {
  const groups = new Map<string, NotionCoffee[]>()

  for (const notionCoffee of coffees) {
    const key = `${nameKey(notionCoffee.roaster)}\n${nameKey(notionCoffee.name)}`

    groups.set(key, [...(groups.get(key) ?? []), notionCoffee])
  }

  return [...groups.values()].map(bought =>
    bought.sort((a, b) => b.purchasedOn.localeCompare(a.purchasedOn)),
  )
}

function mergedEntries<
  Field extends 'origins' | 'processes' | 'varietals' | 'flavorNotes',
>(bought: NotionCoffee[], field: Field) {
  return [
    ...new Set(bought.flatMap(notionCoffee => notionCoffee[field])),
  ] as NotionCoffee[Field]
}

async function storePurchases(
  db: Database,
  input: { shelfId: string; coffeeId: string; userId: string },
  bought: NotionCoffee[],
) {
  for (const notionCoffee of bought) {
    const values = {
      roastedOn: null,
      sizeGrams: notionCoffee.sizeGrams,
      priceCents: priceCents(notionCoffee.price),
      finishedAt: notionCoffee.finishedAt,
    }
    const [existing] = await db
      .select({ id: purchase.id })
      .from(purchase)
      .where(
        and(
          eq(purchase.shelfId, input.shelfId),
          eq(purchase.coffeeId, input.coffeeId),
          eq(purchase.purchasedOn, notionCoffee.purchasedOn),
        ),
      )

    if (existing) {
      await db.update(purchase).set(values).where(eq(purchase.id, existing.id))
    } else {
      await db.insert(purchase).values({
        shelfId: input.shelfId,
        coffeeId: input.coffeeId,
        purchasedOn: notionCoffee.purchasedOn,
        addedBy: input.userId,
        ...values,
      })
    }
  }
}

async function importCoffee(
  db: Database,
  input: Omit<NotionImport, 'flavorNotes' | 'coffees' | 'copyPhoto'>,
  bought: NotionCoffee[],
) {
  const latest = bought[0]!
  const link = bought.find(notionCoffee => notionCoffee.link)?.link ?? null
  const described = {
    roastLevel: latest.roastLevel,
    roastedFor: roastedForOf(link),
    link,
  }

  return db.transaction(async tx => {
    const { coffee: found } = await addCatalogCoffee(tx, {
      userId: input.userId,
      details: {
        roaster: latest.roaster,
        name: latest.name,
        ...described,
        origins: mergedEntries(bought, 'origins'),
        regions: [],
        farms: [],
        washingStations: [],
        producers: [],
        processes: mergedEntries(bought, 'processes'),
        varietals: mergedEntries(bought, 'varietals'),
        flavorNotes: mergedEntries(bought, 'flavorNotes'),
      },
      whenFound: 'update',
    })
    await storePurchases(tx, { ...input, coffeeId: found.id }, bought)
    await tx
      .update(coffee)
      .set({
        createdAt: sql`least(${coffee.createdAt}, (select min(${purchase.purchasedOn}) from ${purchase} where ${purchase.coffeeId} = ${found.id})::timestamp)`,
      })
      .where(eq(coffee.id, found.id))
    await judgeCoffee(tx, {
      coffeeId: found.id,
      userId: input.userId,
      verdict: {
        rating:
          bought.find(notionCoffee => notionCoffee.rating)?.rating ?? null,
        wouldBuyAgain: latest.wouldBuyAgain,
      },
    })

    return found
  })
}

export async function importNotion(db: Database, input: NotionImport) {
  const { shelfId, userId } = input
  const missingPhotos: string[] = []

  for (const name of input.flavorNotes) {
    await findOrCreateEntry(db, flavorNote, { name, createdBy: userId })
  }

  for (const grinder of importedGrinders) {
    await ownGrinder(db, { shelfId, userId, grinder })
  }

  const groups = groupNotionCoffees(input.coffees)

  for (const bought of groups) {
    const imported = await importCoffee(db, { shelfId, userId }, bought)
    const photoUrl = bought.find(
      notionCoffee => notionCoffee.photoUrl,
    )?.photoUrl

    if (imported.photoUrl || !photoUrl) continue

    const copied = await input.copyPhoto(photoUrl)

    if (copied) {
      await db
        .update(coffee)
        .set({ photoUrl: copied })
        .where(eq(coffee.id, imported.id))
    } else {
      missingPhotos.push(`${imported.roaster} ${imported.name}`)
    }
  }

  return {
    coffees: groups.length,
    purchases: input.coffees.length,
    flavorNotes: input.flavorNotes.length,
    missingPhotos,
  }
}

export async function findImportShelf(db: Database, email: string) {
  const [found] = await db
    .select({ shelfId: shelf.id, userId: user.id })
    .from(user)
    .innerJoin(shelf, eq(shelf.ownerId, user.id))
    .where(eq(user.email, email.toLowerCase()))
    .orderBy(asc(shelf.createdAt))
    .limit(1)

  if (!found) throw new Error(`No user with a shelf of their own for ${email}`)

  return found
}
