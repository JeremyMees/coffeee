import { inArray } from 'drizzle-orm'
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

async function namesOf(
  db: Database,
  param: keyof FilterLabelSearch,
  ids: string[],
) {
  const { table, id, name } = named[param]
  const rows = await db.select({ id, name }).from(table).where(inArray(id, ids))

  return Object.fromEntries(
    rows.map(row => [row.id as string, row.name as string]),
  )
}

export async function findFilterLabels(
  db: Database,
  search: FilterLabelSearch,
): Promise<FilterLabels> {
  const params = (Object.keys(named) as (keyof FilterLabelSearch)[]).filter(
    param => search[param].length,
  )
  const names = await Promise.all(
    params.map(param => namesOf(db, param, search[param])),
  )

  return Object.fromEntries(
    params.flatMap((param, index) =>
      Object.keys(names[index]!).length ? [[param, names[index]]] : [],
    ),
  )
}
