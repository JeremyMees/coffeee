import { and, eq, ne } from 'drizzle-orm'
import type { RoasterDetails } from '#shared/types/roasters'
import { nameKey } from '#shared/utils/names'
import type { Database } from '#server/types/database'
import type { Viewer } from '#server/types/coffees'
import type { EditableRoasterLogo } from '#server/types/photos'
import { roaster } from '#server/db/schemas'
import { canEditCatalogEntry } from '#server/utils/catalog'
import { deletePhoto } from '#server/utils/photos'

const roasterColumns = {
  id: roaster.id,
  name: roaster.name,
  website: roaster.website,
  countryCode: roaster.countryCode,
  city: roaster.city,
  logoUrl: roaster.logoUrl,
}

export async function findRoaster(
  db: Database,
  input: { roasterId: string; viewer: Viewer },
) {
  const [found] = await db
    .select({ ...roasterColumns, createdBy: roaster.createdBy })
    .from(roaster)
    .where(eq(roaster.id, input.roasterId))

  if (!found) return undefined

  const { createdBy, ...details } = found

  return { ...details, canEdit: canEditCatalogEntry(input.viewer, createdBy) }
}

export async function findEditableRoaster(
  db: Database,
  input: { roasterId: string; editor: Viewer },
) {
  const [current] = await db
    .select({ createdBy: roaster.createdBy, logoUrl: roaster.logoUrl })
    .from(roaster)
    .where(eq(roaster.id, input.roasterId))

  if (!current) return { outcome: 'notFound' as const }

  if (!canEditCatalogEntry(input.editor, current.createdBy)) {
    return { outcome: 'forbidden' as const }
  }

  return { outcome: 'editable' as const, logoUrl: current.logoUrl }
}

export function editRoaster(
  db: Database,
  input: { roasterId: string; editor: Viewer; details: RoasterDetails },
) {
  const { details } = input

  return db.transaction(async tx => {
    const current = await findEditableRoaster(tx, input)

    if (current.outcome !== 'editable') return current

    const key = nameKey(details.name)
    const [taken] = await tx
      .select({ name: roaster.name })
      .from(roaster)
      .where(and(eq(roaster.nameKey, key), ne(roaster.id, input.roasterId)))

    if (taken) return { outcome: 'taken' as const, taken }

    const [edited] = await tx
      .update(roaster)
      .set({
        name: details.name,
        nameKey: key,
        website: details.website,
        countryCode: details.countryCode,
        city: details.city,
      })
      .where(eq(roaster.id, input.roasterId))
      .returning(roasterColumns)

    return { outcome: 'edited' as const, roaster: edited! }
  })
}

export async function replaceRoasterLogo(
  db: Database,
  current: EditableRoasterLogo,
  logoUrl: string | null,
) {
  await db
    .update(roaster)
    .set({ logoUrl })
    .where(eq(roaster.id, current.roasterId))
  await deletePhoto(current.logoUrl)

  return { logoUrl }
}
