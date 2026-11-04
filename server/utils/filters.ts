import { eq } from 'drizzle-orm'
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core'
import type { FilterLabelSearch, FilterLabels } from '#shared/types/filters'
import type { Database } from '#server/types/database'
import {
  flavorNote,
  origin,
  processList,
  roaster,
  varietal,
} from '#server/db/schemas'

const named: Record<
  keyof FilterLabelSearch,
  { table: PgTable; id: PgColumn; name: PgColumn }
> = {
  roasterId: { table: roaster, id: roaster.id, name: roaster.name },
  flavorNoteId: { table: flavorNote, id: flavorNote.id, name: flavorNote.name },
  originCode: { table: origin, id: origin.code, name: origin.name },
  processId: { table: processList, id: processList.id, name: processList.name },
  varietalId: { table: varietal, id: varietal.id, name: varietal.name },
}

async function nameOf(
  db: Database,
  param: keyof FilterLabelSearch,
  id: string,
) {
  const { table, id: idColumn, name } = named[param]
  const [row] = await db
    .select({ name })
    .from(table)
    .where(eq(idColumn, id))
    .limit(1)

  return row?.name as string | undefined
}

export async function findFilterLabels(
  db: Database,
  search: FilterLabelSearch,
): Promise<FilterLabels> {
  const params = (Object.keys(named) as (keyof FilterLabelSearch)[]).filter(
    param => search[param],
  )
  const names = await Promise.all(
    params.map(param => nameOf(db, param, search[param])),
  )

  return Object.fromEntries(
    params.flatMap((param, index) =>
      names[index] ? [[param, names[index]]] : [],
    ),
  )
}
